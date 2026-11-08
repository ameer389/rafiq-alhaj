import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { useSession } from './session'
import { useMembers } from './useMembers'
import { isArrival, recipientsOf } from './arrival'
import { subscribeLive } from './live'
import { loadCache, saveCache } from './storage'

// Leader side: all campaign messages + who confirmed each one, kept live via Realtime.
// acks = { [messageId]: { [memberId]: acked_at } }
// Cached per campaign on the device: renders from the cache first (opens offline), then refreshes.
const Ctx = createContext(null)
const KEEP = 60 // newest messages / requests kept on the device

export function LeaderDataProvider({ children }) {
  const { campaign } = useSession()
  const cid = campaign?.id
  const { members, pilgrims } = useMembers(cid)
  const [messages, setMessages] = useState(() => loadCache(cid, 'messages'))
  const [acks, setAcks] = useState(() => loadCache(cid, 'acks', {}))
  const [helpRequests, setHelpRequests] = useState(() => loadCache(cid, 'help'))
  const helpRef = useRef(helpRequests)
  helpRef.current = helpRequests
  const cacheCid = useRef(cid) // campaign the state above belongs to

  // Keep the device cache in step with what's on screen (only real data — never the empty initial state).
  // Declared BEFORE the fetch effect: on a campaign switch they run while cacheCid is still the old one,
  // so the old campaign's data is never written under the new campaign's key.
  useEffect(() => { if (messages && cacheCid.current === cid) saveCache(cid, 'messages', messages.slice(0, KEEP)) }, [cid, messages])
  useEffect(() => { if (cacheCid.current === cid) saveCache(cid, 'acks', acks) }, [cid, acks])
  useEffect(() => { if (helpRequests && cacheCid.current === cid) saveCache(cid, 'help', helpRequests.slice(0, KEEP)) }, [cid, helpRequests])

  useEffect(() => {
    if (!cid) return
    if (cacheCid.current !== cid) { // switched campaign while mounted → show that campaign's cache
      cacheCid.current = cid
      setMessages(loadCache(cid, 'messages')); setAcks(loadCache(cid, 'acks', {})); setHelpRequests(loadCache(cid, 'help'))
    }
    let alive = true
    const fetchAll = async () => {
      const { data: msgs, error } = await supabase.from('messages').select('*')
        .eq('campaign_id', cid).order('created_at', { ascending: false })
      if (error) { console.error('messages', error); return }
      const ids = msgs.map((m) => m.id)
      const { data: rows, error: aErr } = ids.length
        ? await supabase.from('acknowledgements').select('*').in('message_id', ids)
        : { data: [] }
      if (aErr) console.error('acks', aErr)
      if (!alive) return
      const map = {}
      for (const r of rows ?? []) (map[r.message_id] ??= {})[r.member_id] = r.acked_at
      setMessages(msgs); setAcks(map)
    }
    const fetchHelp = async () => {
      const { data, error } = await supabase.from('help_requests').select('*')
        .eq('campaign_id', cid).order('created_at', { ascending: false })
      if (error) console.error('help_requests', error)
      else if (alive) setHelpRequests(data)
    }
    const resync = () => { fetchAll(); fetchHelp() }
    resync()

    const addAck = (r) => setAcks((prev) => ({ ...prev, [r.message_id]: { ...prev[r.message_id], [r.member_id]: r.acked_at } }))
    const stop = subscribeLive(`leader-${cid}`, (ch) => ch
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `campaign_id=eq.${cid}` },
        ({ new: m }) => setMessages((prev) => (prev?.some((x) => x.id === m.id) ? prev : [m, ...(prev ?? [])])))
      // acknowledgements has no campaign_id column; RLS limits events to this leader's campaign.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'acknowledgements' }, ({ new: r }) => addAck(r))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'acknowledgements' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_requests', filter: `campaign_id=eq.${cid}` }, fetchHelp), resync)

    return () => { alive = false; stop() }
  }, [cid])

  // Add a message we just sent without waiting for the Realtime echo.
  const addMessage = useCallback((m) =>
    setMessages((prev) => (prev?.some((x) => x.id === m.id) ? prev : [m, ...(prev ?? [])])), [])

  // Leader-only: move a help request to in_progress / resolved (optimistic, reverts on error).
  const updateRequest = useCallback(async (id, status, extra = {}) => {
    const before = helpRef.current?.find((r) => r.id === id)?.status
    setHelpRequests((prev) => prev?.map((r) => (r.id === id ? { ...r, status, ...extra } : r)))
    const { error, status: http } = await supabase.from('help_requests').update({ status, ...extra }).eq('id', id)
    if (error) {
      setHelpRequests((prev) => prev?.map((r) => (r.id === id ? { ...r, status: before } : r)))
      return { error, status: http }
    }
    return {}
  }, [])

  const openRequests = useMemo(() => (helpRequests ?? []).filter((r) => r.status !== 'resolved'), [helpRequests])

  const value = useMemo(() => ({ messages, acks, members, pilgrims, addMessage, helpRequests, openRequests, updateRequest }),
    [messages, acks, members, pilgrims, addMessage, helpRequests, openRequests, updateRequest])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useLeaderData = () => useContext(Ctx)

// Counter for one message: confirmed / total recipients, plus who hasn't confirmed.
// For an arrival check, "confirmed" = arrived.
export function ackStats(m, acks, pilgrims) {
  if (!m) return { confirmed: [], pending: [], count: 0, total: 0, byMember: {} }
  const byMember = acks[m.id] ?? {}
  const to = recipientsOf(m)
  const audience = to ? pilgrims.filter((p) => to.includes(p.id)) : pilgrims
  const confirmed = audience.filter((p) => byMember[p.id])
  const pending = audience.filter((p) => !byMember[p.id])
  return { confirmed, pending, count: confirmed.length, total: audience.length, byMember }
}

// Latest arrival check + who hasn't arrived (drives "وصلوا" on home and the "لم يصلوا" recipients).
export function arrivalStats(messages, acks, pilgrims) {
  const latest = messages?.find(isArrival) ?? null
  return { latest, ...ackStats(latest, acks, pilgrims) }
}

// Screens 44/45/46 — status per pilgrim:
//   needHelp (has a help request that isn't resolved) > arrived / notConfirmed (latest arrival check) > null (no check yet)
export function memberStatuses(pilgrims, messages, acks, helpRequests) {
  const arrival = messages?.find(isArrival) ?? null
  const arrivedBy = arrival ? (acks[arrival.id] ?? {}) : null
  const activeReq = {}
  for (const r of helpRequests ?? []) if (r.status !== 'resolved' && !activeReq[r.member_id]) activeReq[r.member_id] = r
  const map = {}
  for (const p of pilgrims) {
    const request = activeReq[p.id] ?? null
    const arrivedAt = arrivedBy?.[p.id] ?? null
    map[p.id] = { request, arrivedAt, state: request ? 'needHelp' : arrivedBy ? (arrivedAt ? 'arrived' : 'notConfirmed') : null }
  }
  return { map, arrival }
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { useSession } from './session'
import { useMembers } from './useMembers'
import { isArrival, recipientsOf } from './arrival'
import { subscribeLive } from './live'

// Leader side: all campaign messages + who confirmed each one, kept live via Realtime.
// acks = { [messageId]: { [memberId]: acked_at } }
const Ctx = createContext(null)

export function LeaderDataProvider({ children }) {
  const { campaign } = useSession()
  const cid = campaign?.id
  const { members, pilgrims } = useMembers(cid)
  const [messages, setMessages] = useState(null)
  const [acks, setAcks] = useState({})

  useEffect(() => {
    if (!cid) return
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
    fetchAll()

    const addAck = (r) => setAcks((prev) => ({ ...prev, [r.message_id]: { ...prev[r.message_id], [r.member_id]: r.acked_at } }))
    const stop = subscribeLive(`leader-${cid}`, (ch) => ch
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `campaign_id=eq.${cid}` },
        ({ new: m }) => setMessages((prev) => (prev?.some((x) => x.id === m.id) ? prev : [m, ...(prev ?? [])])))
      // acknowledgements has no campaign_id column; RLS limits events to this leader's campaign.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'acknowledgements' }, ({ new: r }) => addAck(r))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'acknowledgements' }, fetchAll), fetchAll)

    return () => { alive = false; stop() }
  }, [cid])

  // Add a message we just sent without waiting for the Realtime echo.
  const addMessage = useCallback((m) =>
    setMessages((prev) => (prev?.some((x) => x.id === m.id) ? prev : [m, ...(prev ?? [])])), [])

  const value = useMemo(() => ({ messages, acks, members, pilgrims, addMessage }), [messages, acks, members, pilgrims, addMessage])
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

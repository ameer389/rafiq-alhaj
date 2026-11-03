import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { useSession } from './session'
import { useMembers } from './useMembers'

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
    const ch = supabase.channel(`leader-${cid}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `campaign_id=eq.${cid}` },
        ({ new: m }) => setMessages((prev) => (prev?.some((x) => x.id === m.id) ? prev : [m, ...(prev ?? [])])))
      // acknowledgements has no campaign_id column; RLS limits events to this leader's campaign.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'acknowledgements' }, ({ new: r }) => addAck(r))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'acknowledgements' }, fetchAll)
      .subscribe()

    const refresh = () => document.visibilityState === 'visible' && fetchAll()
    window.addEventListener('online', fetchAll)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      alive = false
      supabase.removeChannel(ch)
      window.removeEventListener('online', fetchAll)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [cid])

  const value = useMemo(() => ({ messages, acks, members, pilgrims }), [messages, acks, members, pilgrims])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useLeaderData = () => useContext(Ctx)

// Counter for one message: confirmed / total pilgrims, plus who hasn't confirmed.
export function ackStats(messageId, acks, pilgrims) {
  const byMember = acks[messageId] ?? {}
  const confirmed = pilgrims.filter((p) => byMember[p.id])
  const pending = pilgrims.filter((p) => !byMember[p.id])
  return { confirmed, pending, count: confirmed.length, total: pilgrims.length, byMember }
}

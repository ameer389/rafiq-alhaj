import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { load, save } from './storage'
import { useSession } from './session'

// Pilgrim side: campaign messages + which ones I confirmed + leader names.
// Live via Realtime, cached in localStorage so messages open offline.
const Ctx = createContext(null)

export function PilgrimMessagesProvider({ children }) {
  const { member, campaign } = useSession()
  const [messages, setMessages] = useState(() => load('rafiq.messages', []))
  const [acked, setAcked] = useState(() => new Set(load('rafiq.acked', [])))
  const [leaders, setLeaders] = useState({})
  const [incoming, setIncoming] = useState(null) // newest message received live (for the floating banner)

  const cid = campaign?.id
  const mid = member?.id

  useEffect(() => {
    if (!cid || !mid) return
    let alive = true
    const fetchAll = async () => {
      const [m, a, l] = await Promise.all([
        supabase.from('messages').select('*').eq('campaign_id', cid).order('created_at', { ascending: false }),
        supabase.from('acknowledgements').select('message_id').eq('member_id', mid),
        supabase.from('members').select('id,name').eq('campaign_id', cid).eq('role', 'leader'),
      ])
      if (!alive) return
      if (m.error) console.error('messages', m.error); else setMessages(m.data)
      if (a.error) console.error('acks', a.error)
      else { const s = new Set(a.data.map((x) => x.message_id)); setAcked(s); save('rafiq.acked', [...s]) }
      if (!l.error) setLeaders(Object.fromEntries(l.data.map((x) => [x.id, x.name])))
    }
    fetchAll()

    const ch = supabase.channel(`pilgrim-messages-${cid}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `campaign_id=eq.${cid}` }, ({ new: msg }) => {
        setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [msg, ...prev]))
        setIncoming(msg)
        navigator.vibrate?.([200, 100, 200])
      })
      .subscribe()

    // Catch up on anything missed while offline / in background.
    const refresh = () => document.visibilityState === 'visible' && fetchAll()
    window.addEventListener('online', fetchAll)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      alive = false
      supabase.removeChannel(ch)
      window.removeEventListener('online', fetchAll)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [cid, mid])

  useEffect(() => { save('rafiq.messages', messages.slice(0, 30)) }, [messages])

  const ack = useCallback(async (messageId) => {
    const { error } = await supabase.from('acknowledgements').insert({ message_id: messageId, member_id: mid })
    if (error && error.code !== '23505') throw error // 23505 = already confirmed
    setAcked((prev) => {
      const s = new Set(prev); s.add(messageId); save('rafiq.acked', [...s]); return s
    })
  }, [mid])

  const value = useMemo(() => ({
    messages, acked, leaders, ack, incoming, dismissIncoming: () => setIncoming(null),
  }), [messages, acked, leaders, ack, incoming])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const usePilgrimMessages = () => useContext(Ctx)

// Text of a message in the pilgrim's language (falls back to the Arabic original).
export function messageText(m, lang) {
  if (lang === 'ar') return m.original_text
  return m.translations?.[lang] || m.original_text
}
export const isTranslated = (m, lang) => lang !== 'ar' && !!m.translations?.[lang]

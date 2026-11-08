import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { load, save } from './storage'
import { useSession } from './session'
import { isArrival, isForMember, translationIn } from './arrival'
import { subscribeLive } from './live'

// Pilgrim side: campaign messages + which ones I confirmed + leader names.
// Live via Realtime, cached in localStorage so messages open offline.
const Ctx = createContext(null)

export function PilgrimMessagesProvider({ children }) {
  const { member, campaign } = useSession()
  const [messages, setMessages] = useState(() => load('rafiq.messages', []))
  const [acked, setAcked] = useState(() => new Set(load('rafiq.acked', [])))
  const [leaders, setLeaders] = useState(() => load('rafiq.leaders', {}))
  const [incoming, setIncoming] = useState(null) // newest message received live (for the floating banner)

  const cid = campaign?.id
  const mid = member?.id

  useEffect(() => {
    if (!cid || !mid) return
    let alive = true
    let known = null // ids seen so far; null until the first fetch (so old messages don't pop a banner)

    const announce = (msg) => {
      setIncoming(msg)
      try { navigator.vibrate?.([200, 100, 200]) } catch { /* not allowed before first tap */ }
    }

    const fetchAll = async () => {
      const [m, a, l] = await Promise.all([
        supabase.from('messages').select('*').eq('campaign_id', cid).order('created_at', { ascending: false }),
        supabase.from('acknowledgements').select('message_id').eq('member_id', mid),
        supabase.from('members').select('id,name').eq('campaign_id', cid).eq('role', 'leader'),
      ])
      if (!alive) return
      if (m.error) console.error('messages', m.error)
      else {
        const mine = m.data.filter((x) => isForMember(x, mid))
        // A message Realtime missed but polling found → still show the "new message" banner.
        if (known) { const fresh = mine.find((x) => !known.has(x.id)); if (fresh) announce(fresh) }
        known = new Set(mine.map((x) => x.id))
        setMessages(mine)
      }
      if (a.error) console.error('acks', a.error)
      else { const s = new Set(a.data.map((x) => x.message_id)); setAcked(s); save('rafiq.acked', [...s]) }
      if (!l.error) { const map = Object.fromEntries(l.data.map((x) => [x.id, x.name])); setLeaders(map); save('rafiq.leaders', map) }
    }
    fetchAll()

    const stop = subscribeLive(`pilgrim-messages-${cid}`, (ch) => ch
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `campaign_id=eq.${cid}` }, ({ new: msg }) => {
        if (!isForMember(msg, mid)) return // addressed to other pilgrims (e.g. "not arrived")
        known?.add(msg.id)
        setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [msg, ...prev]))
        announce(msg)
      }), fetchAll)

    return () => { alive = false; stop() }
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
  return translationIn(m, lang) ?? m.original_text
}
// Arrival checks are written natively in every language — no "translated from Arabic" footer.
export const isTranslated = (m, lang) => lang !== 'ar' && !isArrival(m) && !!translationIn(m, lang)

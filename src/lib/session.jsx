import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { load, save } from './storage'
import { useI18n } from '../i18n'

// Session = anonymous Supabase user + their `members` row + their campaign.
// Cached in localStorage so the app opens instantly (and offline) after the first join.
const SessionCtx = createContext(null)

export function SessionProvider({ children }) {
  const { setLang } = useI18n()
  const [member, setMember] = useState(() => load('rafiq.member'))
  const [campaign, setCampaign] = useState(() => load('rafiq.campaign'))
  const [loading, setLoading] = useState(true)

  const applyMember = useCallback((m, c) => {
    setMember(m); save('rafiq.member', m)
    setCampaign(c); save('rafiq.campaign', c)
    if (m?.lang) setLang(m.lang)
  }, [setLang])

  const fetchMembership = useCallback(async (userId) => {
    const { data: m, error } = await supabase.from('members').select('*').eq('user_id', userId).maybeSingle()
    if (error) throw error
    if (!m) return { m: null, c: null }
    const { data: c, error: cErr } = await supabase.from('campaigns').select('*').eq('id', m.campaign_id).maybeSingle()
    if (cErr) throw cErr
    return { m, c }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { applyMember(null, null); return }
        const { m, c } = await fetchMembership(session.user.id)
        if (alive) applyMember(m, c)
      } catch (e) {
        // Offline or network error: keep cached member/campaign.
        console.warn('session refresh failed, using cache', e)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [applyMember, fetchMembership])

  // Returns null on success, or an error key for i18n.
  const join = useCallback(async ({ code, name, lang }) => {
    let { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) { console.error(error); return 'join.errGeneric' }
      session = data.session
    }
    const { data: m, error } = await supabase.rpc('join_campaign', {
      p_code: code.trim().toUpperCase(), p_name: name.trim(), p_lang: lang,
    })
    if (error) {
      console.error(error)
      return /invalid code/i.test(error.message) ? 'join.errInvalid' : 'join.errGeneric'
    }
    const member = Array.isArray(m) ? m[0] : m
    const { data: c } = await supabase.from('campaigns').select('*').eq('id', member.campaign_id).maybeSingle()
    applyMember(member, c)
    return null
  }, [applyMember])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {})
    applyMember(null, null)
  }, [applyMember])

  const value = useMemo(() => ({ member, campaign, loading, join, signOut, isLeader: member?.role === 'leader' }),
    [member, campaign, loading, join, signOut])
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export const useSession = () => useContext(SessionCtx)

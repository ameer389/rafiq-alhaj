import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { load, save } from './storage'
import { useI18n } from '../i18n'

// Session = anonymous Supabase user + their `members` row + their campaign.
// Cached in localStorage so the app opens instantly (and offline) after the first join.
//
// NOTE: the Supabase session lives in localStorage, so ALL TABS of one browser share it.
// If another tab joins/leaves, this tab follows (auth events + `storage` events) and
// re-fetches the member, so the UI always matches the real role. For leader + pilgrim
// side by side, use two browsers or a private window.
const SessionCtx = createContext(null)

async function fetchMembership(userId) {
  const { data: m, error } = await supabase.from('members').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!m) return { m: null, c: null }
  const { data: c, error: cErr } = await supabase.from('campaigns').select('*').eq('id', m.campaign_id).maybeSingle()
  if (cErr) throw cErr
  return { m, c }
}

export function SessionProvider({ children }) {
  const { setLang } = useI18n()
  const [member, setMember] = useState(() => load('rafiq.member'))
  const [campaign, setCampaign] = useState(() => load('rafiq.campaign'))
  const [loading, setLoading] = useState(true)
  const [syncedAt, setSyncedAt] = useState(() => load('rafiq.syncedAt'))
  const memberRef = useRef(member)
  const seq = useRef(0)        // bumps on every change; stale async results are dropped
  const joining = useRef(false)

  // Update this tab's state only (no localStorage write — used for cross-tab sync).
  const setLocal = useCallback((m, c) => {
    memberRef.current = m
    setMember(m); setCampaign(c)
    if (m?.lang) setLang(m.lang)
  }, [setLang])

  // Called with fresh server data (initial load, refresh, join) or null (signed out).
  const applyMember = useCallback((m, c) => {
    seq.current++
    save('rafiq.member', m); save('rafiq.campaign', c)
    const synced = c ? new Date().toISOString() : null // "آخر مزامنة" on the campaign screen
    save('rafiq.syncedAt', synced); setSyncedAt(synced)
    setLocal(m, c)
  }, [setLocal])

  // Re-read the real session + member from the server. Returns the fresh member (or null).
  // `apply: false` lets callers inspect without switching screens.
  const refreshMembership = useCallback(async ({ apply = true } = {}) => {
    const mySeq = seq.current
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { if (apply && seq.current === mySeq) applyMember(null, null); return null }
    const { m, c } = await fetchMembership(session.user.id)
    if (apply && seq.current === mySeq && !joining.current) applyMember(m, c)
    return m
  }, [applyMember])

  // Initial load
  useEffect(() => {
    refreshMembership()
      .catch((e) => console.warn('session refresh failed, using cache', e)) // offline: keep cache
      .finally(() => setLoading(false))
  }, [refreshMembership])

  // Cross-tab sync
  useEffect(() => {
    // supabase-js broadcasts SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED to other tabs.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (joining.current) return
      const cur = memberRef.current
      if (event === 'SIGNED_OUT' || !session) {
        if (cur) applyMember(null, null)
        return
      }
      if (!cur || cur.user_id !== session.user.id) {
        // Don't call Supabase inside the callback (can deadlock the auth lock) — defer.
        setTimeout(() => refreshMembership().catch((e) => console.warn(e)), 0)
      }
    })

    // Another tab saved a different member/campaign → mirror it immediately.
    const onStorage = (e) => {
      if (e.key !== 'rafiq.member' && e.key !== 'rafiq.campaign') return
      seq.current++
      setLocal(load('rafiq.member'), load('rafiq.campaign'))
      setSyncedAt(load('rafiq.syncedAt'))
    }
    // Returning to a tab: make sure the role still matches the shared session.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) refreshMembership().catch(() => {})
    }
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [applyMember, refreshMembership, setLocal])

  // Returns null on success, or an error key for i18n.
  const join = useCallback(async ({ code, name, lang }) => {
    joining.current = true
    try {
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
    } finally {
      joining.current = false
    }
  }, [applyMember])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {})
    save('rafiq.messages', null); save('rafiq.acked', null)
    applyMember(null, null)
  }, [applyMember])

  const value = useMemo(() => ({
    member, campaign, loading, syncedAt, join, signOut, refreshMembership, isLeader: member?.role === 'leader',
  }), [member, campaign, loading, syncedAt, join, signOut, refreshMembership])
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export const useSession = () => useContext(SessionCtx)

// True when a Supabase write was rejected by auth/RLS (403 / 401 / 42501).
export const isAuthError = (error, status) =>
  status === 401 || status === 403 || error?.code === '42501' || error?.code === 'PGRST301'

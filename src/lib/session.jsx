import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { load, save } from './storage'
import { useI18n } from '../i18n'
import { subscribeLive } from './live'

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
  const hold = useRef(false)   // true during join + onboarding (06/07): background refreshes must not switch screens
  const campaignRef = useRef(campaign)
  const [assemblyAlert, setAssemblyAlert] = useState(() => load('rafiq.assemblyAlert'))

  // Update this tab's state only (no localStorage write — used for cross-tab sync).
  const setLocal = useCallback((m, c) => {
    memberRef.current = m
    setMember(m); setCampaign(c)
    if (m?.lang) setLang(m.lang)
  }, [setLang])

  // Called with fresh server data (initial load, refresh, join) or null (signed out).
  const applyMember = useCallback((m, c) => {
    seq.current++
    // Screen 12: the leader moved the assembly time/point → keep an alert (old → new) until dismissed.
    const prev = campaignRef.current
    if (m?.role === 'pilgrim' && prev && c && prev.id === c.id
      && (prev.assembly_time !== c.assembly_time || prev.assembly_point !== c.assembly_point)) {
      const alert = { oldTime: prev.assembly_time, newTime: c.assembly_time, oldPoint: prev.assembly_point, newPoint: c.assembly_point }
      save('rafiq.assemblyAlert', alert); setAssemblyAlert(alert)
    }
    if (!m) { save('rafiq.assemblyAlert', null); setAssemblyAlert(null) }
    campaignRef.current = c
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
    if (apply && seq.current === mySeq && !hold.current) applyMember(m, c)
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
      if (hold.current) return
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
      if (!['rafiq.member', 'rafiq.campaign', 'rafiq.assemblyAlert'].includes(e.key)) return
      seq.current++
      campaignRef.current = load('rafiq.campaign')
      setLocal(load('rafiq.member'), campaignRef.current)
      setSyncedAt(load('rafiq.syncedAt'))
      setAssemblyAlert(load('rafiq.assemblyAlert'))
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

  const ensureSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) return session
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    return data.session
  }

  // Screen 04: what campaign does this code belong to? → { name, leader_name, assembly_point, assembly_time, role } | null
  // Throws on network/server errors (caller shows "try again").
  const preview = useCallback(async (code) => {
    hold.current = true
    await ensureSession()
    const { data, error } = await supabase.rpc('preview_campaign', { p_code: code.trim().toUpperCase() })
    if (error) throw error
    return (Array.isArray(data) ? data[0] : data) ?? null
  }, [])

  // Join. Returns { error: i18nKey } or { member, campaign }.
  // defer: don't switch to the home screen yet (onboarding shows 06 → 07 first); call finishJoin() after.
  const join = useCallback(async ({ code, name, lang }, { defer = false } = {}) => {
    hold.current = true
    try {
      await ensureSession()
      const { data: m, error } = await supabase.rpc('join_campaign', {
        p_code: code.trim().toUpperCase(), p_name: name.trim(), p_lang: lang,
      })
      if (error) {
        console.error(error)
        return { error: /invalid code/i.test(error.message) ? 'join.errInvalid' : 'join.errGeneric' }
      }
      const member = Array.isArray(m) ? m[0] : m
      const { data: c } = await supabase.from('campaigns').select('*').eq('id', member.campaign_id).maybeSingle()
      if (!defer) { hold.current = false; applyMember(member, c) }
      return { member, campaign: c }
    } catch (e) {
      console.error(e)
      return { error: 'join.errGeneric' }
    } finally {
      if (!defer) hold.current = false
    }
  }, [applyMember])

  const finishJoin = useCallback((m, c) => { hold.current = false; campaignRef.current = c; applyMember(m, c) }, [applyMember])
  const cancelOnboarding = useCallback(() => { hold.current = false }, [])

  // Screen 12: live campaign updates (leader edits assembly time/point — screen 53).
  useEffect(() => {
    const cid = campaign?.id
    if (!cid || !member) return
    return subscribeLive(`campaign-${cid}`, (ch) => ch.on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'campaigns', filter: `id=eq.${cid}` },
      ({ new: c }) => { if (!hold.current) applyMember(memberRef.current, { ...campaignRef.current, ...c }) }),
    () => {}, { poll: false })
  }, [campaign?.id, member, applyMember])

  const dismissAssemblyAlert = useCallback(() => { save('rafiq.assemblyAlert', null); setAssemblyAlert(null) }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {})
    save('rafiq.messages', null); save('rafiq.acked', null); save('rafiq.helpQueue', null)
    applyMember(null, null)
  }, [applyMember])

  const value = useMemo(() => ({
    member, campaign, loading, syncedAt, preview, join, finishJoin, cancelOnboarding, signOut, refreshMembership,
    assemblyAlert, dismissAssemblyAlert, isLeader: member?.role === 'leader',
  }), [member, campaign, loading, syncedAt, preview, join, finishJoin, cancelOnboarding, signOut, refreshMembership,
    assemblyAlert, dismissAssemblyAlert])
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export const useSession = () => useContext(SessionCtx)

// True when a Supabase write was rejected by auth/RLS (403 / 401 / 42501).
export const isAuthError = (error, status) =>
  status === 401 || status === 403 || error?.code === '42501' || error?.code === 'PGRST301'

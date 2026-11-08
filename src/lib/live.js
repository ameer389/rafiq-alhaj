import { supabase } from './supabase'

const POLL_MS = 5000

// Subscribe to Realtime robustly + keep data fresh even when Realtime drops events.
//  - waits for the auth session first (refreshes an expired token, e.g. phone reopened after 1 h)
//    and hands the fresh token to Realtime BEFORE joining — otherwise RLS-filtered
//    postgres_changes can silently deliver nothing.
//  - resyncs on channel error / timeout, on `online`, when the tab becomes visible,
//    and every 5 s while visible (safety net on flaky networks).
//  - OFFLINE is quiet: no resync attempts, no rejoin loop, never throws — it waits for the `online`
//    event, then rejoins and resyncs silently. Screens keep showing their cached data meanwhile.
// configure(channel) adds the .on(...) handlers; resync() re-fetches from the DB.
// Returns a cleanup function.
// opts.poll = false → no 5 s safety-net polling (e.g. the campaign row, refreshed on focus anyway).
export function subscribeLive(name, configure, resync, { poll = true } = {}) {
  let channel = null
  let cancelled = false
  let retryTimer = null
  let rejoinWhenOnline = false

  const safeResync = () => {
    if (cancelled || !navigator.onLine) return
    Promise.resolve().then(resync).catch((e) => console.warn('resync failed (will retry)', e))
  }

  const drop = () => {
    if (!channel) return
    const ch = channel
    channel = null
    Promise.resolve(supabase.removeChannel(ch)).catch(() => {})
  }

  const scheduleRejoin = () => {
    if (cancelled || retryTimer) return
    if (!navigator.onLine) { rejoinWhenOnline = true; return } // wait for `online`, no 2 s loop
    retryTimer = setTimeout(() => { retryTimer = null; join() }, 2000)
  }

  const join = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session) await supabase.realtime.setAuth(session.access_token)
    } catch (e) {
      console.warn('realtime auth skipped', e) // offline: join anyway, rejoined when back online
    }
    if (cancelled) return
    try {
      channel = configure(supabase.channel(`${name}-${Math.random().toString(36).slice(2)}`))
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            safeResync()
            drop() // rejoin with a fresh channel
            scheduleRejoin()
          }
        })
    } catch (e) {
      console.warn('realtime join failed (will retry)', e)
      drop()
      scheduleRejoin()
    }
  }
  join()

  const visible = () => document.visibilityState === 'visible'
  const onVisible = () => visible() && safeResync()
  const onOnline = () => {
    safeResync()
    if (rejoinWhenOnline && !channel) { rejoinWhenOnline = false; join() }
  }
  const timer = poll ? setInterval(() => visible() && safeResync(), POLL_MS) : null
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    cancelled = true
    clearInterval(timer)
    clearTimeout(retryTimer)
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
    drop()
  }
}

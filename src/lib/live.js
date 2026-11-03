import { supabase } from './supabase'

const POLL_MS = 5000

// Subscribe to Realtime robustly + keep data fresh even when Realtime drops events.
//  - waits for the auth session first (refreshes an expired token, e.g. phone reopened after 1 h)
//    and hands the fresh token to Realtime BEFORE joining — otherwise RLS-filtered
//    postgres_changes can silently deliver nothing.
//  - resyncs on channel error / timeout, on `online`, when the tab becomes visible,
//    and every 5 s while visible (safety net on flaky networks).
// configure(channel) adds the .on(...) handlers; resync() re-fetches from the DB.
// Returns a cleanup function.
// opts.poll = false → no 5 s safety-net polling (e.g. the campaign row, refreshed on focus anyway).
export function subscribeLive(name, configure, resync, { poll = true } = {}) {
  let channel = null
  let cancelled = false

  const join = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (cancelled) return
    if (session) await supabase.realtime.setAuth(session.access_token)
    if (cancelled) return
    channel = configure(supabase.channel(`${name}-${Math.random().toString(36).slice(2)}`))
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          resync()
          // rejoin with a fresh channel
          if (!cancelled && channel) { supabase.removeChannel(channel); channel = null; setTimeout(join, 2000) }
        }
      })
  }
  join()

  const visible = () => document.visibilityState === 'visible'
  const onVisible = () => visible() && resync()
  const timer = poll ? setInterval(() => visible() && navigator.onLine && resync(), POLL_MS) : null
  window.addEventListener('online', resync)
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    cancelled = true
    clearInterval(timer)
    window.removeEventListener('online', resync)
    document.removeEventListener('visibilitychange', onVisible)
    if (channel) supabase.removeChannel(channel)
  }
}

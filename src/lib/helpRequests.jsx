import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { load, save } from './storage'
import { useSession } from './session'
import { subscribeLive } from './live'

// Pilgrim help requests with an OFFLINE QUEUE (screens 20–27).
// Every request is first saved on the device as "queued" → sent when online (on `online`, app start,
// every 15 s). `client_id` is generated on the device and UNIQUE in the DB → retries are idempotent.
// Statuses shown to the pilgrim (5 steps):
//   1 saved on device (queued / sending / failed) → 2 open → 3 acknowledged → 4 in_progress → 5 resolved
const KEY = 'rafiq.helpQueue'
const SHARE_KEY = 'rafiq.sharingLocation'
const RETRY_MS = 15000
const SHARE_EVERY_MS = 20000
const Ctx = createContext(null)

const newClientId = () =>
  (crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)

// "L-7CAF" — short code shown to pilgrim and leader (derived from client_id, Latin on purpose).
export const requestCode = (r) => `L-${String(r?.client_id ?? r?.id ?? '').replace(/[^0-9a-z]/gi, '').slice(0, 4).toUpperCase()}`

// 1..5 (see header). `failed` = online but the server refused → screen 23.
export function requestStep(r) {
  if (!r) return 0
  if (r.state === 'cancelled' || r.resolvedLocally || r.server?.status === 'resolved') return 5
  if (r.state !== 'sent') return 1
  return { open: 2, acknowledged: 3, in_progress: 4 }[r.server?.status] ?? 2
}
export const isActive = (r) => requestStep(r) > 0 && requestStep(r) < 5

export function HelpRequestsProvider({ children }) {
  const { member } = useSession()
  const mid = member?.id
  const [queue, setQueueState] = useState(() => load(KEY, []))
  const [server, setServer] = useState({}) // client_id → server row (status updates from the leader)
  const [sharing, setSharingState] = useState(() => load(SHARE_KEY, false))
  const flushing = useRef(false)
  const queueRef = useRef(queue)

  const setQueue = useCallback((updater) => {
    setQueueState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      queueRef.current = next
      save(KEY, next)
      return next
    })
  }, [])
  const patch = useCallback((cid, fields) =>
    setQueue((q) => q.map((x) => (x.client_id === cid ? { ...x, ...fields } : x))), [setQueue])

  // Send every queued item + every pending «وصلت بأمان». Safe to call any time (single flight).
  const flush = useCallback(async () => {
    if (flushing.current || !navigator.onLine || !mid) return
    const pending = queueRef.current.filter((r) => r.member_id === mid && (r.state === 'queued' || (r.state === 'sent' && r.resolvePending)))
    if (!pending.length) return
    flushing.current = true
    try {
      for (const r of pending) {
        if (r.state === 'sent') { // pilgrim closed it while offline → tell the server now
          const { error } = await supabase.from('help_requests')
            .update({ status: 'resolved', resolved_by: 'pilgrim' }).eq('client_id', r.client_id)
          if (!error) patch(r.client_id, { resolvePending: false })
          continue
        }
        patch(r.client_id, { state: 'sending' })
        const { error } = await supabase.from('help_requests').insert({
          client_id: r.client_id, campaign_id: r.campaign_id, member_id: r.member_id,
          type: r.type, note: r.note || null, lat: r.lat, lng: r.lng,
          location_shared: r.location_shared, created_at: r.created_at, // time created on the device
        })
        const ok = !error || error.code === '23505' // duplicate client_id → it already arrived earlier
        if (error && !ok) console.warn('help request not sent yet', error)
        // failed = we were online and the server still refused it (screen 23); offline stays a quiet "queued" (22)
        patch(r.client_id, ok
          ? { state: 'sent', failed: false, sent_at: new Date().toISOString() }
          : { state: 'queued', failed: navigator.onLine })
        if (!ok) break // keep order, retry later
      }
    } finally {
      flushing.current = false
    }
  }, [mid, patch])

  // Items stuck in "sending" (app closed mid-send) go back to the queue.
  useEffect(() => { setQueue((q) => q.map((x) => (x.state === 'sending' ? { ...x, state: 'queued' } : x))) }, [setQueue])

  // Auto-send: on start, when back online, and periodically while something is waiting.
  useEffect(() => {
    flush()
    window.addEventListener('online', flush)
    const timer = setInterval(() => {
      if (queueRef.current.some((r) => r.state === 'queued' || r.resolvePending)) flush()
    }, RETRY_MS)
    return () => { window.removeEventListener('online', flush); clearInterval(timer) }
  }, [flush])

  // Status from the server (leader: acknowledged / in_progress / resolved). RLS: pilgrim sees only own rows.
  useEffect(() => {
    if (!mid) return
    let alive = true
    const fetchMine = async () => {
      const { data, error } = await supabase.from('help_requests').select('*').eq('member_id', mid)
      if (error || !alive) return
      setServer(Object.fromEntries(data.map((r) => [r.client_id ?? r.id, r])))
    }
    fetchMine()
    const stop = subscribeLive(`help-mine-${mid}`, (ch) => ch
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_requests', filter: `member_id=eq.${mid}` }, fetchMine), fetchMine)
    return () => { alive = false; stop() }
  }, [mid])

  // My requests, newest first: local queue (with server status) + server rows not on this device.
  const requests = useMemo(() => {
    const local = queue.filter((r) => r.member_id === mid)
    const localIds = new Set(local.map((r) => r.client_id))
    const remote = Object.values(server)
      .filter((s) => !localIds.has(s.client_id))
      .map((s) => ({ ...s, client_id: s.client_id ?? s.id, state: 'sent', server: s }))
    return [...local.map((r) => ({ ...r, server: server[r.client_id] ?? null })), ...remote]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  }, [queue, server, mid])
  const active = useMemo(() => requests.find(isActive) ?? null, [requests])

  // ---- live location (members.shared_*) — only after explicit consent, only while a request is active ----
  const setSharing = useCallback((on) => { save(SHARE_KEY, on); setSharingState(on) }, [])
  const pushLocation = useCallback(async (loc) => {
    if (!mid) return
    await supabase.from('members').update(loc
      ? { shared_lat: loc.lat, shared_lng: loc.lng, location_shared_at: new Date().toISOString() }
      : { shared_lat: null, shared_lng: null, location_shared_at: null }).eq('id', mid)
  }, [mid])
  useEffect(() => {
    if (!sharing || !active || !navigator.geolocation) return
    let last = 0
    const id = navigator.geolocation.watchPosition((p) => {
      if (Date.now() - last < SHARE_EVERY_MS) return
      last = Date.now()
      pushLocation({ lat: p.coords.latitude, lng: p.coords.longitude }).catch(() => {})
    }, () => {}, { enableHighAccuracy: true, maximumAge: 15000 })
    return () => navigator.geolocation.clearWatch(id)
  }, [sharing, active, pushLocation])
  // Stops by itself when there is no active request any more (screen 27: "توقف إرسال مكانك").
  useEffect(() => {
    if (sharing && !active && requests.length) { setSharing(false); pushLocation(null).catch(() => {}) }
  }, [sharing, active, requests.length, setSharing, pushLocation])

  const startSharing = useCallback(async () => {
    const loc = await getLocationOnce()
    if (!loc) return false
    setSharing(true)
    if (active && active.state !== 'sent') patch(active.client_id, { ...loc, location_shared: true }) // goes out with the request
    pushLocation(loc).catch(() => {})
    return true
  }, [active, patch, pushLocation, setSharing])
  const stopSharing = useCallback(() => { setSharing(false); pushLocation(null).catch(() => {}) }, [setSharing, pushLocation])

  // ---- actions ----
  // Create a request: always saved locally first, then sent if possible.
  const submit = useCallback(({ type = 'lost', note = '', lat = null, lng = null }) => {
    const item = {
      client_id: newClientId(), campaign_id: member.campaign_id, member_id: member.id,
      type, note: note.trim(), lat, lng, location_shared: lat != null && lng != null,
      created_at: new Date().toISOString(), state: 'queued',
    }
    setQueue((q) => [item, ...q])
    queueRef.current = [item, ...queueRef.current]
    if (item.location_shared) { setSharing(true); pushLocation({ lat, lng }).catch(() => {}) }
    setTimeout(flush, 0)
    return item
  }, [member, flush, setQueue, setSharing, pushLocation])

  const retry = useCallback((cid) => { patch(cid, { failed: false }); setTimeout(flush, 0) }, [patch, flush])

  // Screen 27 «وصلت بأمان»: never sent → close on the device only; sent → status=resolved, resolved_by=pilgrim
  // (RLS allows exactly this on his own request). Offline → remembered and sent later.
  const resolveMine = useCallback(async (r) => {
    if (r.state !== 'sent') { patch(r.client_id, { state: 'cancelled', resolvedLocally: true }); return }
    if (!queueRef.current.some((x) => x.client_id === r.client_id)) { // server-only row → keep a local copy
      setQueue((q) => [{ ...r, server: undefined }, ...q])
    }
    patch(r.client_id, { resolvedLocally: true, resolvePending: true })
    const { error } = await supabase.from('help_requests')
      .update({ status: 'resolved', resolved_by: 'pilgrim' }).eq('client_id', r.client_id)
    if (!error) patch(r.client_id, { resolvePending: false })
    else console.warn('resolve will be retried', error)
  }, [patch, setQueue])

  const value = useMemo(() => ({
    requests, active, submit, flush, retry, resolveMine, sharing, startSharing, stopSharing,
  }), [requests, active, submit, flush, retry, resolveMine, sharing, startSharing, stopSharing])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useHelpRequests = () => useContext(Ctx)

// One-shot location (explicit consent). Resolves { lat, lng } or null.
export function getLocationOnce(timeout = 8000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 60000 },
    )
  })
}

export const HELP_TYPES = [
  { type: 'lost', icon: 'compass', tone: 'bg-danger-soft text-danger-ink' },
  { type: 'medical', icon: 'siren', tone: 'bg-danger-soft text-danger-ink' },
  { type: 'other', icon: 'handshake', tone: 'bg-primary-soft text-primary' },
]
export const isUrgentType = (type) => type === 'lost' || type === 'medical'

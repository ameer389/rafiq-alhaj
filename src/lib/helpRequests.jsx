import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { load, save } from './storage'
import { useSession } from './session'
import { subscribeLive } from './live'

// Pilgrim help requests with an OFFLINE QUEUE.
// Every request is first saved on the device (localStorage) as "queued" → sent when online
// (on `online`, app start, and every 15 s while something is queued). `client_id` is generated
// on the device and is UNIQUE in the DB, so retries are idempotent (duplicate = already sent).
const KEY = 'rafiq.helpQueue'
const RETRY_MS = 15000
const Ctx = createContext(null)

const newClientId = () =>
  (crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)

export function HelpRequestsProvider({ children }) {
  const { member } = useSession()
  const mid = member?.id
  const [queue, setQueueState] = useState(() => load(KEY, []))
  const [server, setServer] = useState({}) // client_id → server row (status updates from the leader)
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

  // Send every queued item. Safe to call any time (single flight).
  const flush = useCallback(async () => {
    if (flushing.current || !navigator.onLine) return
    const pending = queueRef.current.filter((r) => r.state === 'queued' && r.member_id === mid)
    if (!pending.length) return
    flushing.current = true
    try {
      for (const r of pending) {
        setQueue((q) => q.map((x) => (x.client_id === r.client_id ? { ...x, state: 'sending' } : x)))
        const { error } = await supabase.from('help_requests').insert({
          client_id: r.client_id, campaign_id: r.campaign_id, member_id: r.member_id,
          type: r.type, note: r.note || null, lat: r.lat, lng: r.lng,
          location_shared: r.location_shared, created_at: r.created_at, // time created on the device
        })
        const ok = !error || error.code === '23505' // duplicate client_id → it already arrived earlier
        if (error && !ok) console.warn('help request not sent yet', error)
        setQueue((q) => q.map((x) => (x.client_id === r.client_id
          ? { ...x, state: ok ? 'sent' : 'queued', sent_at: ok ? new Date().toISOString() : x.sent_at } : x)))
        if (!ok) break // offline / server down → retry later, keep order
      }
    } finally {
      flushing.current = false
    }
  }, [mid, setQueue])

  // Items stuck in "sending" (app closed mid-send) go back to the queue.
  useEffect(() => { setQueue((q) => q.map((x) => (x.state === 'sending' ? { ...x, state: 'queued' } : x))) }, [setQueue])

  // Auto-send: on start, when back online, and periodically while something is queued.
  useEffect(() => {
    flush()
    window.addEventListener('online', flush)
    const timer = setInterval(() => { if (queueRef.current.some((r) => r.state === 'queued')) flush() }, RETRY_MS)
    return () => { window.removeEventListener('online', flush); clearInterval(timer) }
  }, [flush])

  // Status from the server (leader marks "in progress" / "resolved"). RLS: pilgrim sees only own rows.
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

  // Create a request: always saved locally first, then sent if possible.
  const submit = useCallback(({ type, note, lat = null, lng = null }) => {
    const item = {
      client_id: newClientId(), campaign_id: member.campaign_id, member_id: member.id,
      type, note: note?.trim() || '', lat, lng, location_shared: lat != null && lng != null,
      created_at: new Date().toISOString(), state: 'queued',
    }
    setQueue((q) => [item, ...q])
    queueRef.current = [item, ...queueRef.current]
    setTimeout(flush, 0)
    return item
  }, [member, flush, setQueue])

  // My requests, newest first: local queue (with server status when available)
  // + server rows not on this device (e.g. sent from another phone / storage cleared).
  const requests = useMemo(() => {
    const local = queue.filter((r) => r.member_id === mid)
    const localIds = new Set(local.map((r) => r.client_id))
    const remote = Object.values(server)
      .filter((s) => !localIds.has(s.client_id))
      .map((s) => ({ ...s, client_id: s.client_id ?? s.id, state: 'sent', server: s }))
    return [...local.map((r) => ({ ...r, server: server[r.client_id] ?? null })), ...remote]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  }, [queue, server, mid])

  const value = useMemo(() => ({ requests, submit, flush }), [requests, submit, flush])
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
  { type: 'other', icon: 'handshake', tone: 'bg-mint text-mint-ink' },
]
export const isUrgentType = (type) => type === 'lost' || type === 'medical'

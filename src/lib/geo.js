import { useEffect, useState } from 'react'

// Feature 8 helpers — everything here works OFFLINE (GPS + math, no network).
const R = 6371000
const rad = (d) => (d * Math.PI) / 180
const deg = (r) => (r * 180) / Math.PI

export function distanceM(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
// Initial bearing a → b, degrees clockwise from north.
export function bearingDeg(a, b) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat))
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng))
  return (deg(Math.atan2(y, x)) + 360) % 360
}
export const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
export const cardinal = (b) => CARDINALS[Math.round(b / 45) % 8]
export const WALK_M_PER_MIN = 80
export const walkMinutes = (m) => Math.max(1, Math.ceil(m / WALK_M_PER_MIN))
// "about" rounding: 10 m steps under 100 m, 50 m steps after
export const roundDistance = (m) => (m < 100 ? Math.max(10, Math.round(m / 10) * 10) : Math.round(m / 50) * 50)
export const ACCURATE_ENOUGH_M = 100 // worse than this → screen 17 (no distance, no fake directions)

// Watch the position while the screen is open. Never sent anywhere.
// status: asking | ok | denied | unavailable
export function useWatchPosition(enabled) {
  const [state, setState] = useState({ status: enabled ? 'asking' : 'idle', pos: null })
  useEffect(() => {
    if (!enabled) return
    if (!navigator.geolocation) { setState({ status: 'unavailable', pos: null }); return }
    setState((s) => ({ ...s, status: s.pos ? 'ok' : 'asking' }))
    const id = navigator.geolocation.watchPosition(
      (p) => setState({ status: 'ok', pos: { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy } }),
      (e) => setState((s) => ({ ...s, status: e.code === 1 ? 'denied' : s.pos ? 'ok' : 'unavailable' })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enabled])
  return state
}

// Compass heading (degrees from north) if the phone provides one, else null.
export function useHeading() {
  const [heading, setHeading] = useState(null)
  useEffect(() => {
    const onAbs = (e) => { if (e.absolute && e.alpha != null) setHeading((360 - e.alpha) % 360) }
    const onIOS = (e) => { if (e.webkitCompassHeading != null) setHeading(e.webkitCompassHeading) }
    window.addEventListener('deviceorientationabsolute', onAbs)
    window.addEventListener('deviceorientation', onIOS)
    return () => { window.removeEventListener('deviceorientationabsolute', onAbs); window.removeEventListener('deviceorientation', onIOS) }
  }, [])
  return heading
}

// Current browser permission for geolocation: 'granted' | 'denied' | 'prompt' | 'unknown'
export async function geoPermission() {
  try { return (await navigator.permissions.query({ name: 'geolocation' })).state } catch { return 'unknown' }
}

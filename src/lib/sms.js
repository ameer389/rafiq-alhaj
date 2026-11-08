import { tIn } from '../i18n'
import { isIos } from './install'

// SMS fallback for a help request that can't reach the server (no data in the crowd).
// The pilgrim's phone opens its SMS app with the leader's number + a short ARABIC body (for the leader).
// The body carries a link to /r on our app: when the leader taps it, `leader_log_help` logs the request
// with the SAME client_id → when the pilgrim's queue syncs later, the insert hits the unique client_id
// and counts as already sent (no duplicate).

const fix5 = (n) => Number(n).toFixed(5)
export const cleanPhone = (p) => String(p ?? '').replace(/[^\d+]/g, '')

// Text of the SMS (always Arabic — it's read by the leader).
export function smsBody(r, pilgrimName, origin = window.location.origin) {
  const hasLoc = r.lat != null && r.lng != null
  const ts = Math.floor(new Date(r.created_at ?? Date.now()).getTime() / 1000)
  const q = new URLSearchParams({ m: r.member_id, c: r.client_id, t: r.type ?? 'other' })
  if (hasLoc) { q.set('lat', fix5(r.lat)); q.set('lng', fix5(r.lng)) }
  q.set('ts', String(ts))
  const type = tIn('ar', `sms.type_${['lost', 'medical', 'other'].includes(r.type) ? r.type : 'other'}`)
  return [
    tIn('ar', 'sms.bodyTitle'),
    tIn('ar', 'sms.bodyNeeds', { name: pilgrimName ?? '', type }),
    hasLoc && tIn('ar', 'sms.bodyLocation', { url: `https://maps.google.com/?q=${fix5(r.lat)},${fix5(r.lng)}` }),
    tIn('ar', 'sms.bodyLog', { url: `${origin}/r?${q.toString()}` }),
  ].filter(Boolean).join('\n')
}

// sms: link — iOS wants `sms:NUMBER&body=`, Android `sms:NUMBER?body=`.
export function smsUrl(phone, body) {
  return `sms:${cleanPhone(phone)}${isIos ? '&' : '?'}body=${encodeURIComponent(body)}`
}

export const telUrl = (phone) => `tel:${cleanPhone(phone)}`

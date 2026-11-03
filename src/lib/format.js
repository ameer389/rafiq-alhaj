// Times are shown in Makkah time regardless of device timezone.
const TZ = 'Asia/Riyadh'

export function fmtTime(iso, lang = 'ar', t) {
  if (!iso) return ''
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }).formatToParts(d)
  const get = (type) => parts.find((p) => p.type === type)?.value
  const hm = `${get('hour')}:${get('minute')}`
  if (lang === 'en') return `${hm} ${get('dayPeriod')}`
  if (lang === 'id') {
    const h24 = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }).format(d)
    return h24.replace(':', '.')
  }
  const period = get('dayPeriod') === 'AM' ? t?.('common.am') : t?.('common.pm')
  return `${hm} ${period ?? ''}`.trim()
}

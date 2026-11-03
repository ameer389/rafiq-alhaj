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

// Calendar day in Makkah time: "اليوم" / "أمس" / "3 نوفمبر".
const LOCALE = { ar: 'ar-SA-u-nu-latn-ca-gregory', ur: 'ur-PK', en: 'en-US', id: 'id-ID' }
const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d) // YYYY-MM-DD
export function fmtDay(iso, lang = 'ar', t) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86400000)
  if (dayKey(d) === dayKey(today)) return t?.('campaign.today') ?? ''
  if (dayKey(d) === dayKey(yesterday)) return t?.('campaign.yesterday') ?? ''
  return new Intl.DateTimeFormat(LOCALE[lang] ?? 'en-US', { day: 'numeric', month: 'long', timeZone: TZ }).format(d)
}
export const fmtDayTime = (iso, lang, t) => (iso ? `${fmtDay(iso, lang, t)}، ${fmtTime(iso, lang, t)}` : '')

// "+966550102024" → "+966 55 010 2024"
export function fmtPhone(p) {
  if (!p) return ''
  const m = p.replace(/\s+/g, '').match(/^\+966(\d{2})(\d{3})(\d{4})$/)
  return m ? `+966 ${m[1]} ${m[2]} ${m[3]}` : p
}

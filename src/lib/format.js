// Times are shown in Makkah time regardless of device timezone.
const TZ = 'Asia/Riyadh'

// Digits per language (design): Arabic → ٠١٢٣٤٥٦٧٨٩, Urdu → its own ۰۱۲۳۴۵۶۷۸۹, en/id → 0-9.
// Codes, phone numbers and request ids (L-0427, +966…) stay Latin — don't pass them through this.
const DIGITS = { ar: '٠١٢٣٤٥٦٧٨٩', ur: '۰۱۲۳۴۵۶۷۸۹' }
export function localDigits(value, lang) {
  const set = DIGITS[lang]
  const s = String(value ?? '')
  return set ? s.replace(/[0-9]/g, (d) => set[d]) : s
}
export const fmtNum = (n, lang) => localDigits(n, lang)

// "٤:٣٠ م" / "4:30 PM" / "16.30". long: "٤:٣٠ مساءً" (assembly time on the green card).
export function fmtTime(iso, lang = 'ar', t, { long = false } = {}) {
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
  const am = get('dayPeriod') === 'AM'
  const period = t?.(long ? (am ? 'common.amLong' : 'common.pmLong') : (am ? 'common.am' : 'common.pm'))
  return localDigits(`${hm} ${period ?? ''}`.trim(), lang)
}

// Calendar day in Makkah time: "اليوم" / "أمس" / "٣ نوفمبر".
const LOCALE = { ar: 'ar-SA-u-nu-arab-ca-gregory', ur: 'ur-PK-u-nu-arabext', en: 'en-US', id: 'id-ID' }
const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d) // YYYY-MM-DD
export function fmtDay(iso, lang = 'ar', t) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86400000)
  if (dayKey(d) === dayKey(today)) return t?.('campaign.today') ?? ''
  if (dayKey(d) === dayKey(yesterday)) return t?.('campaign.yesterday') ?? ''
  return localDigits(new Intl.DateTimeFormat(LOCALE[lang] ?? 'en-US', { day: 'numeric', month: 'long', timeZone: TZ }).format(d), lang)
}
export const fmtDayTime = (iso, lang, t) => (iso ? `${fmtDay(iso, lang, t)}، ${fmtTime(iso, lang, t)}` : '')

// "+966550102024" → "+966 55 010 2024" (always Latin digits, LTR)
export function fmtPhone(p) {
  if (!p) return ''
  const m = p.replace(/\s+/g, '').match(/^\+966(\d{2})(\d{3})(\d{4})$/)
  return m ? `+966 ${m[1]} ${m[2]} ${m[3]}` : p
}

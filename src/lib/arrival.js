import { LANGS, tIn } from '../i18n'
import { supabase } from './supabase'

export const isArrival = (m) => m?.kind === 'arrival_check'

// Leader: send an arrival check. Text is ready-made in every language (no translation API call).
// Returns { message } or { error, status }.
export async function sendArrivalCheck(member) {
  const translations = Object.fromEntries(LANGS.map(({ code }) => [code, tIn(code, 'arrival.request')]))
  const { data, error, status } = await supabase.from('messages').insert({
    campaign_id: member.campaign_id, sender_id: member.id,
    original_text: translations.ar, translations, priority: 'important', kind: 'arrival_check',
  }).select().single()
  return error ? { error, status } : { message: data }
}

// Optional recipient list stored inside translations jsonb as `_to` (no schema change needed).
// Missing `_to` = everyone.
export const recipientsOf = (m) => (Array.isArray(m?.translations?._to) ? m.translations._to : null)
export const isForMember = (m, memberId) => { const to = recipientsOf(m); return !to || to.includes(memberId) }
// Real language entries only: skips 'ar' (the original) and meta keys such as `_to` (non-strings too).
export const translationLangs = (m) => Object.entries(m?.translations ?? {})
  .filter(([l, v]) => l !== 'ar' && !l.startsWith('_') && typeof v === 'string' && v.trim())
  .map(([l]) => l)
// Text of a message in `lang`, or null if there is no real translation for it.
export const translationIn = (m, lang) => {
  if (!lang || lang.startsWith('_')) return null
  const v = m?.translations?.[lang]
  return typeof v === 'string' && v.trim() ? v : null
}

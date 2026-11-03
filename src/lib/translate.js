import { supabase } from './supabase'

// Calls the `translate` edge function (Gemini, all targets in ONE request; falls back to
// MyMemory server-side when Gemini is overloaded and then returns `fallback: true`).
// Resolves to { translations: { ur, en, id, ... }, fallback: boolean } or throws —
// callers fall back to manual editing.
export async function translateText(text, targets, timeoutMs = 30000) {
  let timer
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs) })
  try {
    const { data, error } = await Promise.race([
      supabase.functions.invoke('translate', { body: { text, targets } }),
      timeout,
    ])
    if (error) throw error
    if (!data?.translations) throw new Error(data?.error || 'no translations')
    return { translations: data.translations, fallback: data.fallback === true }
  } finally {
    clearTimeout(timer)
  }
}

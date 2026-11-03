import { supabase } from './supabase'

// Calls the `translate` edge function (Gemini, all targets in ONE request).
// Resolves to { ur, en, id, ... } or throws — callers fall back to manual editing.
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
    return data.translations
  } finally {
    clearTimeout(timer)
  }
}

import { useCallback, useEffect, useState } from 'react'

const LOCALE = { ar: 'ar-SA', ur: 'ur-PK', en: 'en-US', id: 'id-ID' }
const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

// Browser text-to-speech. `available` is false when the device has no voice for `lang`
// (Urdu is often missing) — callers disable the Listen button and show a note.
export function useSpeech(lang) {
  const [voice, setVoice] = useState(null)
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    if (!supported) return
    const pick = () => {
      const voices = speechSynthesis.getVoices()
      const match = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(lang))
      setVoice(match.find((v) => v.localService) ?? match[0] ?? null)
    }
    pick()
    speechSynthesis.addEventListener('voiceschanged', pick)
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', pick)
      speechSynthesis.cancel()
    }
  }, [lang])

  const speak = useCallback((text) => {
    if (!supported) return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    if (voice) u.voice = voice
    u.lang = voice?.lang ?? LOCALE[lang]
    u.rate = 0.9 // a bit slower for elderly listeners
    u.onend = u.onerror = () => setSpeaking(false)
    setSpeaking(true)
    speechSynthesis.speak(u)
  }, [voice, lang])

  const stop = useCallback(() => { if (supported) speechSynthesis.cancel(); setSpeaking(false) }, [])

  return { available: supported && !!voice, speaking, speak, stop }
}

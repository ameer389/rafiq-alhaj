import { useSyncExternalStore } from 'react'

// "Add to home screen" state. Imported from main.jsx so `beforeinstallprompt` (fired ONCE, early) is
// never missed, even if no helper is on screen yet.
//  - Android / Chrome: we keep the deferred prompt and show our own big button.
//  - iOS Safari: there is no prompt API → the helper shows the Share → "Add to Home Screen" steps.
//  - Already running from the home screen (standalone) → nothing to show.
let deferred = null
let installed = false
const listeners = new Set()
const emit = () => { snapshot = compute(); listeners.forEach((l) => l()) }

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const isIos = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
// Safari only: other iOS browsers / in-app webviews put "Add to Home Screen" elsewhere (or not at all).
const isIosSafari = isIos && /safari/i.test(ua) && !/crios|fxios|edgios|opios|gsa\/|fban|fbav|instagram|line\//i.test(ua)

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

function compute() {
  const standalone = isStandalone()
  return { standalone, installed, canPrompt: !!deferred && !standalone, ios: isIosSafari && !standalone }
}
let snapshot = compute()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // keep it for our own button instead of the browser mini-bar
    deferred = e
    emit()
  })
  window.addEventListener('appinstalled', () => { installed = true; deferred = null; emit() })
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', emit)
}

// Shows the browser's install dialog. Resolves true if the user accepted.
export async function promptInstall() {
  const e = deferred
  if (!e) return false
  deferred = null // a prompt can only be used once
  try {
    await e.prompt()
    const { outcome } = await e.userChoice
    if (outcome === 'accepted') installed = true
    return outcome === 'accepted'
  } catch {
    return false
  } finally {
    emit()
  }
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
export const useInstall = () => useSyncExternalStore(subscribe, () => snapshot)

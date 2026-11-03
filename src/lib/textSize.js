import { useCallback, useSyncExternalStore } from 'react'
import { load, save } from './storage'

// "Large text" setting (screen 37): a global scale saved on the device.
// Applied as <html data-text="normal|large|xlarge"> → index.css scales the root font size,
// and since every size/spacing is in rem the whole layout grows evenly.
export const TEXT_SIZES = ['normal', 'large', 'xlarge']
const KEY = 'rafiq.textSize'
const listeners = new Set()

const read = () => { const v = load(KEY, 'normal'); return TEXT_SIZES.includes(v) ? v : 'normal' }
export function applyTextSize(size = read()) { document.documentElement.dataset.text = size }

export function setTextSize(size) {
  if (!TEXT_SIZES.includes(size)) return
  save(KEY, size); applyTextSize(size)
  listeners.forEach((l) => l())
}

const subscribe = (l) => {
  listeners.add(l)
  const onStorage = (e) => { if (e.key === KEY) { applyTextSize(); l() } } // other tabs
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(l); window.removeEventListener('storage', onStorage) }
}

export function useTextSize() {
  const size = useSyncExternalStore(subscribe, read)
  return [size, useCallback(setTextSize, [])]
}

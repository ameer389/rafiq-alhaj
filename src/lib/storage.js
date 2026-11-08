// Tiny localStorage helpers (never throw — private mode / quota safe)
export function load(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v) } catch { return fallback }
}
export function save(key, value) {
  try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}
// Remove every key that starts with `prefix` (e.g. all per-campaign caches on «الخروج من الحملة»).
export function clearPrefix(prefix) {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(prefix)) localStorage.removeItem(k)
  } catch { /* ignore */ }
}

// Per-campaign offline cache (leader messages / acks / members / help requests …): the screens render
// from it first, then refresh from the network. Keyed by campaign so a re-join never shows old data.
export const CACHE_PREFIX = 'rafiq.cache.'
export const loadCache = (cid, name, fallback = null) => (cid ? load(`${CACHE_PREFIX}${cid}.${name}`, fallback) : fallback)
export const saveCache = (cid, name, value) => { if (cid) save(`${CACHE_PREFIX}${cid}.${name}`, value) }

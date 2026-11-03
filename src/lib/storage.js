// Tiny localStorage helpers (never throw — private mode / quota safe)
export function load(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v) } catch { return fallback }
}
export function save(key, value) {
  try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useI18n } from '../i18n'

// Tiny toast — mainly «قريبًا» for buttons that lead to LATER screens (design/INDEX.md).
const Ctx = createContext(() => {})

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null)
  const timer = useRef(null)
  const show = useCallback((text) => {
    setMsg(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), 2200)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && (
        <div role="status" className="pointer-events-none fixed inset-x-0 bottom-28 z-50 mx-auto flex max-w-[430px] justify-center px-6">
          <span className="rounded-full bg-ink px-5 py-3 font-bold text-white shadow-lg">{msg}</span>
        </div>
      )}
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)

// onClick handler that shows «قريبًا» — for LATER features.
export function useSoon() {
  const show = useToast()
  const { t } = useI18n()
  return useCallback(() => show(t('common.soon')), [show, t])
}

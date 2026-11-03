import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

// Shared building blocks for the new design (see design/INDEX.md).
// Color meaning: primary = safety/main action · danger = «أنا ضائع»/real danger · sand = waiting · neutral = info.

const BTN_VARIANT = {
  primary: 'bg-primary text-white',
  danger: 'bg-danger text-white',
  secondary: 'border border-line-strong bg-surface text-primary',      // white, green text (04 «ليست مجموعتي»)
  soft: 'border border-primary-line bg-primary-soft text-primary-ink',  // «استمع»
  sand: 'border border-sand-line bg-sand-soft text-sand-ink',
  ghost: 'text-primary',
}
const BTN_SIZE = {
  lg: 'min-h-[3.75rem] px-5 text-lg rounded-[var(--radius-btn)]',
  md: 'min-h-12 px-4 text-base rounded-[var(--radius-btn)]',
  pill: 'min-h-12 px-5 text-base rounded-full',
}

// <Button variant="primary" size="lg" icon="phone" to="/x" | href="tel:…" | onClick>
export function Button({ variant = 'primary', size = 'lg', icon, iconClass = 'size-6', to, href, className = '', children, ...props }) {
  const cls = `inline-flex items-center justify-center gap-2.5 font-bold transition active:scale-[0.99] disabled:opacity-50 ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`
  const body = <>{icon && <Icon name={icon} className={iconClass} />}{children}</>
  if (to) return <Link to={to} className={cls} {...props}>{body}</Link>
  if (href) return <a href={href} className={cls} {...props}>{body}</a>
  return <button type="button" className={cls} {...props}>{body}</button>
}

const TONE = {
  primary: 'border-primary-line bg-primary-soft text-primary-ink',
  sand: 'border-sand-line bg-sand-soft text-sand-ink',
  danger: 'border-danger-line bg-danger-soft text-danger-ink',
  neutral: 'border-line bg-neutral-soft text-muted',
}

// Status pill (40: «طلب جديد» red, «بانتظار المشرف» sand, «المشرف في الطريق» green).
export function Chip({ tone = 'neutral', icon, className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[0.95rem] font-bold leading-none ${TONE[tone]} ${className}`}>
      {icon && <Icon name={icon} className="size-4" />}{children}
    </span>
  )
}

// Boxed notice (22: sand «لم يصل الطلب لقائدك بعد»; neutral info; danger).
export function Notice({ tone = 'neutral', icon, className = '', children }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-[var(--radius-card)] border px-4 py-3.5 font-semibold ${TONE[tone]} ${className}`}>
      {icon && <Icon name={icon} className="mt-0.5 size-5 shrink-0" />}<div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

const CIRCLE = {
  primary: 'bg-primary-soft text-primary',
  sand: 'bg-sand-bg text-sand-ink',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-neutral-soft text-muted',
}
// Round icon (09 tiles: phone/mic; 22: big sand clock). size in rem units of tailwind (size-14 etc.)
export function IconCircle({ icon, tone = 'primary', size = 'size-14', iconSize = 'size-7', className = '' }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full ${CIRCLE[tone]} ${size} ${className}`}>
      <Icon name={icon} className={iconSize} />
    </span>
  )
}

// Label / value row inside a card (04, 33): muted label above a bold value, optional action on the end side.
export function InfoRow({ label, children, action }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="min-w-0 flex-1">
        <div className="text-muted">{label}</div>
        <div className="mt-1 text-lg font-bold leading-snug">{children || '—'}</div>
      </div>
      {action}
    </div>
  )
}
export function InfoCard({ children, className = '' }) {
  return <div className={`divide-y divide-line-soft rounded-[var(--radius-card)] border border-line bg-surface px-5 ${className}`}>{children}</div>
}

// Step progress (22–27): `total` segments, the first `step` are filled. Fills from the start side.
export function StepBar({ step, total = 5, tone = 'sand' }) {
  return (
    <div className="flex gap-2" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2.5 flex-1 rounded-full ${i < step ? (tone === 'sand' ? 'bg-sand' : 'bg-primary') : 'bg-neutral-track'}`} />
      ))}
    </div>
  )
}

// Bottom sheet (20): dimmed page + white sheet with a grab handle.
export function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 mx-auto flex max-w-[430px] flex-col justify-end">
      <button aria-label="close" className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative rounded-t-[1.75rem] bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-track" />
        {title && <h2 className="mb-2 text-2xl font-bold leading-snug">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

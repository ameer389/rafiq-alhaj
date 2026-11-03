import { Link } from 'react-router-dom'
import Icon from './Icon'
import StatusChip from './StatusChip'
import { useI18n } from '../i18n'

// Phone column: max ~430px, centered on desktop, warm page background.
export function Screen({ children, nav, className = '' }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-page">
      <main className={`flex-1 ${nav ? 'pb-24' : 'pb-6'} ${className}`}>{children}</main>
      {nav}
    </div>
  )
}

// Home-style header (screens 09, 40): title + subtitle on the start side, status chip on the end side.
// `badge` replaces the chip; `children` render underneath.
export function AppHeader({ title, subtitle, badge, children }) {
  return (
    <header className="px-5 pb-2 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.6rem] font-bold leading-tight">{title}</h1>
          {subtitle && <div className="mt-1 flex items-center gap-2 text-muted">{subtitle}</div>}
        </div>
        {badge ?? <StatusChip />}
      </div>
      {children}
    </header>
  )
}
/** @deprecated old name — kept so older screens keep working; same light header now. */
export const DarkHeader = AppHeader

// "‹ الرئيسية" / "< Home" — outlined white pill, green text (screens 02, 22, 33, 36).
export function BackPill({ to, onClick, label }) {
  const { t } = useI18n()
  const cls = 'inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-surface px-4 text-lg font-bold text-primary'
  const body = (
    <>
      {/* chevron on the start side, pointing "back": › in RTL, ‹ in LTR */}
      <Icon name="chevronLeft" className="size-5 rtl:-scale-x-100" />
      {label ?? t('common.back')}
    </>
  )
  return to ? <Link to={to} className={cls}>{body}</Link> : <button type="button" onClick={onClick} className={cls}>{body}</button>
}

// Inner-page top: back pill + status chip, then a big page title (screens 04, 22, 33).
// back / close = route to go back to; `backLabel` overrides the pill text (defaults: home → "الرئيسية").
export function TopBar({ title, subtitle, back, close, onBack, backLabel }) {
  const { t } = useI18n()
  const to = back ?? close
  const label = backLabel ?? (to === '/p' || to === '/l' ? t('nav.home') : t('common.back'))
  return (
    <header className="px-5 pb-1 pt-5">
      {to || onBack ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <BackPill to={to} onClick={onBack} label={label} />
            <StatusChip />
          </div>
          {title && <h1 className="mt-5 text-[1.75rem] font-bold leading-tight">{title}</h1>}
          {subtitle && <p className="mt-2 text-lg leading-relaxed text-muted">{subtitle}</p>}
        </>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[1.75rem] font-bold leading-tight">{title}</h1>
          <StatusChip />
        </div>
      )}
    </header>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-[var(--radius-card)] border border-line bg-surface ${className}`}>{children}</div>
}

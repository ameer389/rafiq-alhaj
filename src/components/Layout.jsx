import { Link } from 'react-router-dom'
import Icon from './Icon'
import StatusChip from './StatusChip'

// Mobile frame: max ~430px, centered on desktop.
export function Screen({ children, nav, className = '' }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-page shadow-sm">
      <main className={`flex-1 ${nav ? 'pb-24' : ''} ${className}`}>{children}</main>
      {nav}
    </div>
  )
}

// Dark rounded header used on home screens (designs 04, 16)
export function DarkHeader({ title, subtitle, badge, children }) {
  return (
    <header className="rounded-b-[1.75rem] bg-navy-900 px-5 pb-5 pt-6 text-white">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-[1.6rem] font-bold leading-tight">{title}</h1>
        {badge ?? <StatusChip />}
      </div>
      {subtitle && <div className="mt-1.5 flex items-center gap-2 text-white/75">{subtitle}</div>}
      {children}
    </header>
  )
}

// White top bar with back / close + title + status chip (designs 09-11, 17, 18)
export function TopBar({ title, back, close }) {
  const to = back ?? close
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white px-5 py-4">
      {to && (
        <Link to={to} className="-ms-1 p-1 text-ink" aria-label="back">
          <Icon name={close ? 'x' : 'arrowRight'} className="size-6 ltr:-scale-x-100" />
        </Link>
      )}
      <h1 className="flex-1 text-xl font-bold leading-snug">{title}</h1>
      <StatusChip />
    </header>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-[var(--radius-card)] border border-line bg-white ${className}`}>{children}</div>
}

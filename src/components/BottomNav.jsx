import { NavLink } from 'react-router-dom'
import Icon from './Icon'
import { useI18n } from '../i18n'
import { useLeaderData } from '../lib/leaderData'
import { fmtNum } from '../lib/format'

// Screen 40: white bar, thin top line; active = green icon + bold green label (no pill);
// red badge on the icon corner.
export default function BottomNav({ items }) {
  const { t, lang } = useI18n()
  const leader = useLeaderData() // null on pilgrim screens
  const badgeFor = (it) => (it.to === '/l' ? leader?.openRequests?.length ?? 0 : it.badge)
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[430px] border-t border-line-soft bg-surface pb-[env(safe-area-inset-bottom)]">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => {
          const badge = badgeFor(it)
          return (
            <li key={it.to}>
              <NavLink to={it.to} end className="flex flex-col items-center gap-1 pb-2.5 pt-3">
                {({ isActive }) => (
                  <>
                    <span className={`relative ${isActive ? 'text-primary' : 'text-muted'}`}>
                      <Icon name={it.icon} className="size-7" strokeWidth={isActive ? 2.25 : 1.75} />
                      {badge > 0 && (
                        <span className="absolute -top-2 -end-3 grid min-w-6 place-items-center rounded-full bg-danger px-1.5 py-0.5 text-xs font-bold text-white">
                          {fmtNum(badge, lang)}
                        </span>
                      )}
                    </span>
                    <span className={`text-[0.95rem] ${isActive ? 'font-bold text-primary' : 'text-muted'}`}>{t(it.label)}</span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export const PILGRIM_NAV = [
  { to: '/p', icon: 'home', label: 'nav.home' },
  { to: '/p/assistant', icon: 'chat', label: 'nav.assistant' },
  { to: '/p/campaign', icon: 'users', label: 'nav.myCampaign' },
  { to: '/p/settings', icon: 'settings', label: 'nav.settings' },
]
export const LEADER_NAV = [
  { to: '/l', icon: 'home', label: 'nav.requests' },
  { to: '/l/members', icon: 'users', label: 'nav.members' },
  { to: '/l/messages', icon: 'chat', label: 'nav.messages' },
]

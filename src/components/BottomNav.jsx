import { NavLink } from 'react-router-dom'
import Icon from './Icon'
import { useI18n } from '../i18n'
import { useLeaderData } from '../lib/leaderData'

// items: [{ to, icon, label, badge? }]
export default function BottomNav({ items }) {
  const { t } = useI18n()
  const leader = useLeaderData() // null on pilgrim screens
  const badgeFor = (it) => (it.to === '/l/requests' ? leader?.openRequests?.length ?? 0 : it.badge)
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[430px] border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-4">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink to={it.to} end className="flex flex-col items-center gap-1 py-2.5 text-[0.95rem]">
              {({ isActive }) => (
                <>
                  <span className={`relative rounded-full px-5 py-1 ${isActive ? 'bg-cream text-gold-ink' : 'text-muted'}`}>
                    <Icon name={it.icon} className="size-6" />
                    {badgeFor(it) > 0 && (
                      <span className="absolute -top-1.5 end-2 grid size-5 place-items-center rounded-full bg-danger text-xs font-bold text-white">{badgeFor(it)}</span>
                    )}
                  </span>
                  <span className={isActive ? 'font-bold text-ink' : 'text-muted'}>{t(it.label)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
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
  { to: '/l', icon: 'home', label: 'nav.home' },
  { to: '/l/requests', icon: 'inbox', label: 'nav.requests' },
  { to: '/l/members', icon: 'users', label: 'nav.members' },
  { to: '/l/messages', icon: 'megaphone', label: 'nav.messages' },
]

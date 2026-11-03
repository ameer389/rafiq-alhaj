import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import AssemblyCard from '../../components/AssemblyCard'
import BottomNav, { PILGRIM_NAV } from '../../components/BottomNav'
import { DarkHeader, Screen } from '../../components/Layout'
import { useI18n } from '../../i18n'
import { useSession } from '../../lib/session'
import { usePilgrimMessages } from '../../lib/pilgrimMessages'
import { LatestMessageCard } from '../../components/MessageCards'

const TILES = [
  { icon: 'chat', label: 'home.tileAssistant', to: '/p/assistant' },
  { icon: 'route', label: 'home.tileReturn', to: '/p/soon' },
  { icon: 'info', label: 'home.tileServices', to: '/p/soon' },
  { icon: 'handshake', label: 'home.tileHelp', to: '/p/soon' },
  { icon: 'users', label: 'home.tileCampaign', to: '/p/campaign' },
  { icon: 'qr', label: 'home.tileCard', to: '/p/soon' },
]

// Design 03/04 — pilgrim home
export default function PilgrimHome() {
  const { t } = useI18n()
  const { member, campaign } = useSession()
  const { messages, acked } = usePilgrimMessages()
  const latest = messages[0]
  const latestUnread = latest && !acked.has(latest.id)

  return (
    <Screen nav={<BottomNav items={PILGRIM_NAV} />}>
      <DarkHeader
        title={t('home.hello', { name: member?.name ?? '' })}
        subtitle={<><Icon name="users" className="size-5 text-gold" /><span>{campaign?.name}</span></>}
      />

      <div className="flex flex-col gap-4 px-4 py-5">
        {/* A new (unconfirmed) leader message jumps to the top as a banner */}
        {latest && latestUnread && <LatestMessageCard m={latest} />}

        <AssemblyCard campaign={campaign} />

        <Link to="/p/soon" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-danger px-5 py-5 text-white">
          <span className="grid size-14 place-items-center rounded-full bg-white/20">
            <Icon name="compass" className="size-7" />
          </span>
          <span className="flex-1 text-2xl font-bold">{t('home.lost')}</span>
          <Icon name="chevronLeft" className="size-6 ltr:-scale-x-100" />
        </Link>

        <div className="grid grid-cols-3 gap-3">
          {TILES.map((tile) => (
            <Link key={tile.label} to={tile.to}
              className="flex min-h-32 flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="grid size-12 place-items-center rounded-xl bg-mint text-mint-ink">
                <Icon name={tile.icon} className="size-6" />
              </span>
              <span className="text-[1.05rem] font-bold leading-snug">{t(tile.label)}</span>
            </Link>
          ))}
        </div>

        {latest && !latestUnread && <LatestMessageCard m={latest} />}
        {messages.length > 1 && (
          <Link to="/p/messages" className="text-center font-bold text-mint-ink underline underline-offset-4">
            {t('msg.all')} ({messages.length})
          </Link>
        )}
      </div>
    </Screen>
  )
}

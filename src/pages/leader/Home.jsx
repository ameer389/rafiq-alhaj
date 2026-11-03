import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import AssemblyCard from '../../components/AssemblyCard'
import BottomNav, { LEADER_NAV } from '../../components/BottomNav'
import { DarkHeader, Screen } from '../../components/Layout'
import { useI18n } from '../../i18n'
import { useSession } from '../../lib/session'
import { ackStats, useLeaderData } from '../../lib/leaderData'
import AckCounter from '../../components/AckCounter'
import { useOnline } from '../../lib/useOnline'
import { fmtTime } from '../../lib/format'

function Stat({ value, label, tone = 'text-ink', className = '' }) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-line bg-white p-4 ${className}`}>
      <div className={`text-3xl font-bold ${tone}`}>{value}</div>
      <div className="mt-1 leading-snug text-muted">{label}</div>
    </div>
  )
}

// Design 16 — leader home
export default function LeaderHome() {
  const { t, lang } = useI18n()
  const { member, campaign, signOut } = useSession()
  const online = useOnline()
  const { members, pilgrims, messages, acks } = useLeaderData()
  const latest = messages?.[0]
  const latestStats = latest && ackStats(latest.id, acks, pilgrims)
  const [now, setNow] = useState(() => new Date().toISOString())
  useEffect(() => { setNow(new Date().toISOString()) }, [members])

  return (
    <Screen nav={<BottomNav items={LEADER_NAV} />}>
      <DarkHeader
        title={t('home.hello', { name: member?.name ?? '' })}
        badge={
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold px-3.5 py-1.5 text-sm font-bold text-navy-900">
            <Icon name="userCheck" className="size-4" />{t('leader.badge')}
          </span>
        }
        subtitle={<><Icon name="users" className="size-5 text-gold" /><span>{campaign?.name} · {t('leader.membersCount', { n: pilgrims.length })}</span></>}
      >
        <div className="mt-3 flex items-center justify-between gap-2 text-white/75">
          <span className="flex items-center gap-2">
            <Icon name="checkCircle" className="size-5 text-mint" />
            {online ? t('status.online') : t('status.offline')} · {t('leader.lastUpdate', { time: fmtTime(now, lang, t) })}
          </span>
          <button onClick={() => confirm(t('common.signOutConfirm')) && signOut()} className="p-1 text-white/60" aria-label={t('common.signOut')}>
            <Icon name="logOut" className="size-5 ltr:-scale-x-100" />
          </button>
        </div>
      </DarkHeader>

      <div className="flex flex-col gap-4 px-4 py-5">
        <div className="grid grid-cols-3 gap-3">
          <Stat value={pilgrims.length} label={t('leader.statMembers')} />
          <Stat value="—" label={t('leader.statArrived')} tone="text-success" />
          <Stat value="—" label={t('leader.statRequests')} tone="text-gold-ink" />
        </div>

        {/* Live "who understood" counter for the latest message */}
        {latest && (
          <Link to={`/l/m/${latest.id}`} className="block rounded-[var(--radius-card)] border border-line bg-white p-4">
            <div className="mb-2 flex items-center gap-2">
              <Icon name="megaphone" className="size-5 text-gold-ink" />
              <span className="font-bold text-gold-ink">{t('acks.latestMessage')}</span>
              <span className="ms-auto text-sm text-muted">{fmtTime(latest.created_at, lang, t)}</span>
            </div>
            <p dir="rtl" className="mb-3 line-clamp-2 leading-relaxed">{latest.original_text}</p>
            <AckCounter count={latestStats.count} total={latestStats.total} size="lg" />
            {latestStats.pending.length > 0 && (
              <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-muted">
                  {t('acks.notConfirmed')}: {latestStats.pending.slice(0, 3).map((p) => p.name).join('، ')}
                  {latestStats.pending.length > 3 ? ` +${latestStats.pending.length - 3}` : ''}
                </span>
                <span className="flex shrink-0 items-center gap-1 font-bold text-navy-800">
                  {t('acks.details')}<Icon name="chevronLeft" className="size-4 ltr:-scale-x-100" />
                </span>
              </div>
            )}
          </Link>
        )}

        <AssemblyCard campaign={campaign} />

        <div className="grid grid-cols-2 gap-3">
          <Link to="/l/new" className="flex items-center justify-center gap-2.5 rounded-2xl bg-navy-800 px-3 py-5 text-lg font-bold text-white">
            <Icon name="megaphone" className="size-6 text-gold" />{t('leader.quickAnnouncement')}
          </Link>
          <Link to="/l/soon" className="flex items-center justify-center gap-2.5 rounded-2xl border-2 border-line-strong bg-white px-3 py-4 text-lg font-bold">
            <Icon name="checkCircle" className="size-6" />{t('leader.arrivalCheck')}
          </Link>
        </div>
      </div>
    </Screen>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import AssemblyCard from '../../components/AssemblyCard'
import BottomNav, { LEADER_NAV } from '../../components/BottomNav'
import { DarkHeader, Screen } from '../../components/Layout'
import { useI18n } from '../../i18n'
import { useSession } from '../../lib/session'
import { useMembers } from '../../lib/useMembers'
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
  const { members, pilgrims } = useMembers(campaign?.id)
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

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import AssemblyCard from '../../components/AssemblyCard'
import AckCounter from '../../components/AckCounter'
import BottomNav, { LEADER_NAV } from '../../components/BottomNav'
import { DarkHeader, Screen } from '../../components/Layout'
import { useI18n } from '../../i18n'
import { isAuthError, useSession } from '../../lib/session'
import { ackStats, arrivalStats, useLeaderData } from '../../lib/leaderData'
import { isArrival, sendArrivalCheck } from '../../lib/arrival'
import { isUrgentType } from '../../lib/helpRequests'
import { useOnline } from '../../lib/useOnline'
import { fmtTime } from '../../lib/format'

function Stat({ value, label, tone = 'text-ink', to }) {
  const body = (
    <>
      <div className={`text-3xl font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="mt-1 leading-snug text-muted">{label}</div>
    </>
  )
  const cls = 'block rounded-[var(--radius-card)] border border-line bg-white p-4'
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>
}

// Design 16 — leader home
export default function LeaderHome() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const { member, campaign, signOut } = useSession()
  const online = useOnline()
  const { members, pilgrims, messages, acks, addMessage, openRequests } = useLeaderData()
  const byId = Object.fromEntries(members.map((m) => [m.id, m]))
  const urgent = openRequests.find((r) => r.status === 'open' && isUrgentType(r.type))
  const [now, setNow] = useState(() => new Date().toISOString())
  useEffect(() => { setNow(new Date().toISOString()) }, [members, acks])

  const latest = messages?.find((m) => !isArrival(m))
  const latestStats = ackStats(latest, acks, pilgrims)
  const arrival = arrivalStats(messages, acks, pilgrims)

  const [arrivalBusy, setArrivalBusy] = useState(false)
  const [arrivalError, setArrivalError] = useState(null)
  async function onArrivalCheck() {
    setArrivalBusy(true); setArrivalError(null)
    const { message, error, status } = await sendArrivalCheck(member)
    setArrivalBusy(false)
    if (error) {
      console.error(error)
      setArrivalError(isAuthError(error, status) ? 'newMsg.leaderSessionEnded' : 'newMsg.sendFailed')
      return
    }
    addMessage(message)
    navigate(`/l/m/${message.id}`)
  }

  return (
    <Screen nav={<BottomNav items={LEADER_NAV} />}>
      <DarkHeader
        title={t('home.hello', { name: member?.name ?? '' })}
        badge={
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sand px-3.5 py-1.5 text-sm font-bold text-primary-dark">
            <Icon name="userCheck" className="size-4" />{t('leader.badge')}
          </span>
        }
        subtitle={<><Icon name="users" className="size-5 text-sand" /><span>{campaign?.name} · {t('leader.membersCount', { n: pilgrims.length })}</span></>}
      >
        <div className="mt-3 flex items-center justify-between gap-2 text-muted">
          <span className="flex items-center gap-2">
            <Icon name="checkCircle" className="size-5 text-primary" />
            {online ? t('status.online') : t('status.offline')} · {t('leader.lastUpdate', { time: fmtTime(now, lang, t) })}
          </span>
          <button onClick={() => confirm(t('common.signOutConfirm')) && signOut()} className="p-1 text-muted" aria-label={t('common.signOut')}>
            <Icon name="logOut" className="size-5 ltr:-scale-x-100" />
          </button>
        </div>
      </DarkHeader>

      <div className="flex flex-col gap-4 px-4 py-5">
        {/* Design 16 — urgent banner: newest open "lost" / "medical" request */}
        {urgent && (
          <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-danger bg-danger-soft p-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-danger text-white"><Icon name="siren" className="size-6" /></span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-danger-ink">{t('help.urgent')} · {byId[urgent.member_id]?.name ?? '—'}</div>
              <div className="text-sm leading-snug text-muted">
                {t(`help.kind_${urgent.type}`)} · {fmtTime(urgent.created_at, lang, t)}{urgent.location_shared ? ` · ${t('help.sharedLocation')}` : ''}
              </div>
            </div>
            <Link to={`/l/requests#${urgent.id}`} className="shrink-0 rounded-xl bg-danger px-5 py-3 font-bold text-white">{t('help.openBtn')}</Link>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Stat value={pilgrims.length} label={t('leader.statMembers')} />
          <Stat value={arrival.latest ? arrival.count : '—'} label={t('leader.statArrived')} tone="text-primary"
            to={arrival.latest ? `/l/m/${arrival.latest.id}` : undefined} />
          <Stat value={openRequests.length} label={t('leader.statRequests')} tone="text-sand-ink" to="/l/requests" />
        </div>

        {/* Live "who understood" counter for the latest announcement */}
        {latest && (
          <Link to={`/l/m/${latest.id}`} className="block rounded-[var(--radius-card)] border border-line bg-white p-4">
            <div className="mb-2 flex items-center gap-2">
              <Icon name="megaphone" className="size-5 text-sand-ink" />
              <span className="font-bold text-sand-ink">{t('acks.latestMessage')}</span>
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
                <span className="flex shrink-0 items-center gap-1 font-bold text-primary">
                  {t('acks.details')}<Icon name="chevronLeft" className="size-4 ltr:-scale-x-100" />
                </span>
              </div>
            )}
          </Link>
        )}

        <AssemblyCard campaign={campaign} aside={arrival.latest && (
          <Link to={`/l/m/${arrival.latest.id}`} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 font-bold">
            <span>{t('arrival.label')}</span>
            <span dir="ltr" className="tabular-nums">{arrival.count} / {arrival.total}</span>
            <Icon name="userCheck" className="size-4 text-primary" />
          </Link>
        )} />

        <div className="grid grid-cols-2 gap-3">
          <Link to="/l/new" className="flex items-center justify-center gap-2.5 rounded-2xl bg-primary px-3 py-5 text-lg font-bold text-white">
            <Icon name="megaphone" className="size-6 text-sand" />{t('leader.quickAnnouncement')}
          </Link>
          <button onClick={onArrivalCheck} disabled={arrivalBusy}
            className="flex items-center justify-center gap-2.5 rounded-2xl border-2 border-line-strong bg-white px-3 py-4 text-lg font-bold disabled:opacity-60">
            <Icon name="checkCircle" className="size-6" />{arrivalBusy ? t('arrival.sending') : t('leader.arrivalCheck')}
          </button>
        </div>
        {arrivalError && <p className="rounded-xl bg-danger-soft px-4 py-3 font-semibold text-danger-ink">{t(arrivalError)}</p>}
      </div>
    </Screen>
  )
}

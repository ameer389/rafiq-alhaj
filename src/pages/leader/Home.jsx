import { Link } from 'react-router-dom'
import BottomNav, { LEADER_NAV } from '../../components/BottomNav'
import LeaderHeader from '../../components/LeaderHeader'
import { Screen } from '../../components/Layout'
import { Button, Chip } from '../../components/ui'
import TextSizeControl from '../../components/TextSizeControl'
import { useI18n } from '../../i18n'
import { useSession } from '../../lib/session'
import { arrivalStats, useLeaderData } from '../../lib/leaderData'
import { requestCode } from '../../lib/helpRequests'
import { fmtNum, fmtTime } from '../../lib/format'
import InstallHelper from '../../components/InstallHelper'

export const REQ_CHIP = { open: 'danger', acknowledged: 'sand', in_progress: 'primary', resolved: 'neutral' }

// Screen 40 — leader home = requests: stats strip, NEW requests in red (real danger), then «قيد المتابعة»,
// then the assembly point with «تعديل» (53).
export default function LeaderHome() {
  const { t, lang } = useI18n()
  const { campaign, signOut } = useSession()
  const { members, pilgrims, messages, acks, openRequests } = useLeaderData()
  const byId = Object.fromEntries(members.map((m) => [m.id, m]))
  const arrival = arrivalStats(messages, acks, pilgrims)
  const fresh = openRequests.filter((r) => r.status === 'open')
  const following = openRequests.filter((r) => r.status !== 'open')

  const Stat = ({ n, label, to }) => (
    <Link to={to} className="flex-1 px-4 py-4 text-start">
      <div className="text-[2rem] font-bold leading-tight">{n}</div>
      <div className="text-muted">{label}</div>
    </Link>
  )

  return (
    <Screen nav={<BottomNav items={LEADER_NAV} />}>
      <LeaderHeader />
      <div className="flex flex-col gap-4 px-5 pt-3">
        <section className="flex divide-x divide-line-soft rounded-[var(--radius-card)] border border-line bg-surface">
          <Stat n={fmtNum(pilgrims.length, lang)} label={t('leader.statMembers')} to="/l/members" />
          <Stat n={arrival.latest ? fmtNum(arrival.count, lang) : '—'} label={t('leader.statArrived')} to="/l/members?f=arrived" />
          <Stat n={fmtNum(openRequests.length, lang)} label={t('leader.statRequests')} to="/l" />
        </section>

        {fresh.map((r) => (
          <article key={r.id} className="rounded-[var(--radius-card)] border border-danger-line bg-danger-soft p-5">
            <div className="flex items-center justify-between gap-2">
              <Chip tone="danger" className="bg-surface/70">{t('lh.newReq')}</Chip>
              <b dir="ltr">{requestCode(r)}</b>
            </div>
            <h2 className="mt-3 text-xl font-bold">{t('lh.needsHelp', { name: byId[r.member_id]?.name ?? '—' })}</h2>
            <p className="mt-1 text-lg text-muted">
              {fmtTime(r.created_at, lang, t)} · {t(r.location_shared || byId[r.member_id]?.shared_lat != null ? 'lh.locShared' : 'lh.locNotShared')}
            </p>
            <Button variant="danger" className="mt-4 w-full" to={`/l/r/${r.id}`}>{t('lh.openReqBtn')}</Button>
          </article>
        ))}

        {following.length > 0 && <h2 className="mt-2 text-lg font-bold text-muted">{t('lh.following')}</h2>}
        {following.map((r) => (
          <Link key={r.id} to={`/l/r/${r.id}`} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <div className="min-w-0 flex-1">
              <div className="text-xl font-bold">{byId[r.member_id]?.name ?? '—'}</div>
              <div className="mt-1 text-muted"><span dir="ltr">{requestCode(r)}</span> · {fmtTime(r.created_at, lang, t)}</div>
            </div>
            <Chip tone={REQ_CHIP[r.status]}>{t(`lh.st_${r.status}`)}</Chip>
          </Link>
        ))}
        {openRequests.length === 0 && <p className="rounded-[var(--radius-card)] border border-line bg-surface p-5 text-center text-muted">{t('lh.noOpen')}</p>}

        <section className="flex items-end gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <div className="min-w-0 flex-1">
            <div className="text-lg text-muted">{t('lh.assembly')}</div>
            <div className="mt-1 text-xl font-bold">
              {campaign?.assembly_point}{campaign?.assembly_time ? ` · ${fmtTime(campaign.assembly_time, lang, t, { long: true })}` : ''}
            </div>
          </div>
          <Link to="/l/assembly" className="px-1 py-1 text-lg font-bold text-primary">{t('lh.edit')}</Link>
        </section>

        {/* once after joining, until closed/installed (also inside «الإعدادات» below) */}
        <InstallHelper once />

        <details className="mt-2 rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4">
          <summary className="cursor-pointer text-lg font-bold text-muted">{t('lh.settings')}</summary>
          <div className="mt-4 flex flex-col gap-4">
            <TextSizeControl />
            <InstallHelper />
            <Button variant="secondary" icon="logOut" iconClass="size-5 ltr:-scale-x-100"
              onClick={() => confirm(t('common.signOutConfirm')) && signOut()}>{t('common.signOut')}</Button>
          </div>
        </details>
      </div>
    </Screen>
  )
}

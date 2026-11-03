import { Link, useParams } from 'react-router-dom'
import BottomNav, { LEADER_NAV } from '../../components/BottomNav'
import { Screen, TopBar } from '../../components/Layout'
import { Button, Chip, InfoCard, InfoRow } from '../../components/ui'
import { langLabel, useI18n } from '../../i18n'
import { memberStatuses, useLeaderData } from '../../lib/leaderData'
import { requestCode } from '../../lib/helpRequests'
import { useToast } from '../../lib/toast'
import { fmtTime } from '../../lib/format'
import { STATE_CHIP } from './Members'
import { REQ_CHIP } from './Home'
import { mapsUrl } from './RequestDetail'

// Screen 46 — member details: basic info only. The location shows ONLY while he shares it within a
// help request (his consent); otherwise we say so.
export default function MemberDetail() {
  const { id } = useParams()
  const { t, lang } = useI18n()
  const toast = useToast()
  const { pilgrims, messages, acks, helpRequests } = useLeaderData()
  const p = pilgrims.find((x) => x.id === id)
  if (!p) {
    return (
      <Screen nav={<BottomNav items={LEADER_NAV} />}>
        <TopBar back="/l/members" />
        <p className="py-16 text-center text-muted">{t('common.loading')}</p>
      </Screen>
    )
  }
  const { map } = memberStatuses(pilgrims, messages, acks, helpRequests)
  const s = map[p.id] ?? {}
  const sharing = s.request && p.shared_lat != null
  const myRequests = (helpRequests ?? []).filter((r) => r.member_id === p.id)

  return (
    <Screen nav={<BottomNav items={LEADER_NAV} />}>
      <TopBar back="/l/members" />
      <div className="flex flex-col gap-4 px-5 pt-4">
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-neutral-soft text-2xl font-bold">{p.name.trim()[0]}</span>
          <div className="min-w-0">
            <h1 className="text-[1.75rem] font-bold leading-tight">{p.name}</h1>
            {s.state && <Chip tone={STATE_CHIP[s.state][0]} className="mt-1">{t(STATE_CHIP[s.state][1])}</Chip>}
          </div>
        </div>

        <InfoCard>
          <InfoRow label={t('mem.appLang')}>{langLabel(p.lang)}</InfoRow>
          <InfoRow label={t('mem.arrival')}>
            {s.state === 'needHelp' ? t('mem.hasOpenReq')
              : s.arrivedAt ? t('mem.arrivedAt', { time: fmtTime(s.arrivedAt, lang, t) })
              : s.state === 'notConfirmed' ? t('mem.notConfirmedYet') : t('mem.noArrivalYet')}
          </InfoRow>
          <InfoRow label={t('lh.location')}>
            <span className="text-base font-normal">
              {sharing ? t('mem.locSharingNow') : t('mem.locHidden')}
              {sharing && <> <a href={mapsUrl(p.shared_lat, p.shared_lng)} target="_blank" rel="noreferrer" className="font-bold text-primary">{t('lh.openMap')}</a></>}
            </span>
          </InfoRow>
        </InfoCard>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" icon="phone" onClick={() => toast(t('lh.noPhone'))}>{t('lh.call')}</Button>
          <Button variant="secondary" icon="chat" to={`/l/messages?to=${p.id}`}>{t('lh.message')}</Button>
        </div>

        {myRequests.map((r) => (
          <Link key={r.id} to={`/l/r/${r.id}`} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4">
            <span className="text-lg">{t('lh.reqTitle', { code: '' })}<b dir="ltr">{requestCode(r)}</b></span>
            <Chip tone={REQ_CHIP[r.status]}>{t(`lh.st_${r.status}`)}</Chip>
          </Link>
        ))}
      </div>
    </Screen>
  )
}

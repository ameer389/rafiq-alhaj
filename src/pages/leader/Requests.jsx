import { useState } from 'react'
import BottomNav, { LEADER_NAV } from '../../components/BottomNav'
import Icon from '../../components/Icon'
import { Screen, TopBar } from '../../components/Layout'
import { langLabel, useI18n } from '../../i18n'
import { useLeaderData } from '../../lib/leaderData'
import { isAuthError } from '../../lib/session'
import { HELP_TYPES, isUrgentType } from '../../lib/helpRequests'
import { fmtDayTime, fmtTime } from '../../lib/format'

const ORDER = { open: 0, acknowledged: 1, in_progress: 2, resolved: 3 }
const STATUS_STYLE = {
  open: ['bg-danger-soft text-danger-ink', 'help.leaderOpen'],
  acknowledged: ['bg-primary-soft text-primary', 'help.leaderAck'],
  in_progress: ['bg-sand-soft text-sand-ink', 'help.in_progress'],
  resolved: ['bg-primary-soft text-primary', 'help.resolved'],
}

export const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`

function RequestCard({ r, member }) {
  const { t, lang } = useI18n()
  const { updateRequest } = useLeaderData()
  const [err, setErr] = useState(null)
  const urgent = isUrgentType(r.type) && r.status === 'open'
  const icon = HELP_TYPES.find((h) => h.type === r.type)?.icon ?? 'handshake'
  const [chipCls, chipKey] = STATUS_STYLE[r.status] ?? STATUS_STYLE.open
  const delayed = r.received_at && new Date(r.received_at) - new Date(r.created_at) > 60000 // sent later (was offline)

  async function setStatus(s) {
    setErr(null)
    const { error, status } = await updateRequest(r.id, s)
    if (error) setErr(isAuthError(error, status) ? 'newMsg.leaderSessionEnded' : 'help.updateFailed')
  }

  return (
    <article id={r.id} className={`rounded-[var(--radius-card)] border bg-white p-4 ${urgent ? 'border-danger' : 'border-line'} ${r.status === 'resolved' ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full ${urgent ? 'bg-danger text-white' : 'bg-neutral-soft text-muted'}`}>
          <Icon name={icon} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-bold ${urgent ? 'text-danger-ink' : ''}`}>{t(`help.kind_${r.type}`) }</span>
            {urgent && <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">{t('help.urgent')}</span>}
          </div>
          <div className="text-lg font-bold">{member?.name ?? '—'}</div>
          {member && <div className="text-sm text-muted">{langLabel(member.lang)}</div>}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${chipCls}`}>{t(chipKey)}</span>
      </div>

      {r.note && <p className="mt-3 rounded-xl bg-page px-3 py-2">{r.note}</p>}

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
        <span>{t('help.createdOnDevice', { time: fmtDayTime(r.created_at, lang, t) })}</span>
        {r.received_at && <span className={delayed ? 'font-semibold text-sand-ink' : ''}>· {t('help.received', { time: fmtTime(r.received_at, lang, t) })}</span>}
      </div>

      {r.location_shared && r.lat != null && (
        <a href={mapsUrl(r.lat, r.lng)} target="_blank" rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 font-bold text-primary">
          <Icon name="flag" className="size-5" />{t('help.openMap')}
        </a>
      )}

      {r.status !== 'resolved' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {r.status !== 'in_progress' ? (
            <button onClick={() => setStatus('in_progress')} className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white">
              <Icon name="handshake" className="size-5" />{t('help.startHelp')}
            </button>
          ) : <span />}
          <button onClick={() => setStatus('resolved')} className="flex items-center justify-center gap-2 rounded-xl border-2 border-line-strong py-3 font-bold">
            <Icon name="checkCircle" className="size-5" />{t('help.resolve')}
          </button>
        </div>
      )}
      {err && <p className="mt-2 text-sm font-semibold text-danger-ink">{t(err)}</p>}
    </article>
  )
}

// Leader — help requests (live). Urgent open first.
export default function Requests() {
  const { t } = useI18n()
  const { helpRequests, members } = useLeaderData()
  const byId = Object.fromEntries(members.map((m) => [m.id, m]))
  const sorted = [...(helpRequests ?? [])].sort((a, b) =>
    (ORDER[a.status] - ORDER[b.status])
    || (Number(isUrgentType(b.type)) - Number(isUrgentType(a.type)))
    || b.created_at.localeCompare(a.created_at))

  return (
    <Screen nav={<BottomNav items={LEADER_NAV} />}>
      <TopBar title={t('nav.requests')} />
      <div className="flex flex-col gap-3 px-4 py-5">
        {helpRequests === null && <p className="py-8 text-center text-muted">{t('common.loading')}</p>}
        {helpRequests?.length === 0 && <p className="py-8 text-center text-muted">{t('help.leaderNone')}</p>}
        {sorted.map((r) => <RequestCard key={r.id} r={r} member={byId[r.member_id]} />)}
      </div>
    </Screen>
  )
}

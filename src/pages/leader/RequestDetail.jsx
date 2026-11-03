import { useState } from 'react'
import { useParams } from 'react-router-dom'
import BottomNav, { LEADER_NAV } from '../../components/BottomNav'
import Icon from '../../components/Icon'
import { Card, Screen, TopBar } from '../../components/Layout'
import { BottomSheet, Button, Chip, InfoCard, InfoRow } from '../../components/ui'
import { langLabel, useI18n } from '../../i18n'
import { useLeaderData } from '../../lib/leaderData'
import { isAuthError } from '../../lib/session'
import { requestCode } from '../../lib/helpRequests'
import { useToast } from '../../lib/toast'
import { fmtDayTime, fmtTime } from '../../lib/format'
import { REQ_CHIP } from './Home'

export const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`

// Screen 41 — request details. No supervisors in our data (42 is LATER), so instead of "assign a
// supervisor" the leader moves the request on: «استلمت» (acknowledged) → «المساعدة في الطريق» (in_progress).
// Screen 43 — close with a reason (resolved_by = leader, resolution_note).
export default function RequestDetail() {
  const { id } = useParams()
  const { t, lang } = useI18n()
  const toast = useToast()
  const { helpRequests, members, updateRequest } = useLeaderData()
  const [closing, setClosing] = useState(false)
  const [err, setErr] = useState(null)
  const r = helpRequests?.find((x) => x.id === id)
  const m = r && members.find((x) => x.id === r.member_id)

  if (!r) {
    return (
      <Screen nav={<BottomNav items={LEADER_NAV} />}>
        <TopBar back="/l" />
        <p className="py-16 text-center text-muted">{helpRequests ? t('msg.notFound') : t('common.loading')}</p>
      </Screen>
    )
  }

  async function setStatus(status, extra) {
    setErr(null)
    const res = await updateRequest(r.id, status, extra)
    if (res.error) setErr(isAuthError(res.error, res.status) ? 'newMsg.leaderSessionEnded' : 'lh.updateFailed')
  }
  async function close(reasonKey) {
    setClosing(false)
    await setStatus('resolved', { resolved_by: 'leader', resolution_note: t(reasonKey) })
  }

  // location: live (member row, while the request is active) or the one sent with the request
  const live = r.status !== 'resolved' && m?.shared_lat != null ? { lat: m.shared_lat, lng: m.shared_lng, at: m.location_shared_at } : null
  const loc = live ?? (r.location_shared && r.lat != null ? { lat: r.lat, lng: r.lng, at: r.created_at } : null)

  return (
    <Screen nav={<BottomNav items={LEADER_NAV} />}>
      <TopBar back="/l" />
      <div className="flex flex-col gap-4 px-5 pt-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[1.75rem] font-bold leading-tight">{m?.name ?? '—'}</h1>
            <p className="mt-1 text-lg text-muted">
              <b dir="ltr" className="text-ink">{requestCode(r)}</b> · {t('lh.langOf', { lang: langLabel(m?.lang) })}
            </p>
          </div>
          <Chip tone={REQ_CHIP[r.status]}>{t(`lh.st_${r.status}`)}</Chip>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" icon="phone" onClick={() => toast(t('lh.noPhone'))}>{t('lh.call')}</Button>
          <Button variant="secondary" icon="chat" to={`/l/messages?to=${r.member_id}`}>{t('lh.message')}</Button>
        </div>

        {r.status !== 'resolved' && (
          <Card className="p-5">
            <h2 className="text-xl font-bold">{t('lh.reqStatus')}</h2>
            {r.status === 'open' && (
              <>
                <Button className="mt-4 w-full" icon="check" onClick={() => setStatus('acknowledged')}>{t('lh.ackBtn')}</Button>
                <p className="mt-2 text-muted">{t('lh.ackHint')}</p>
              </>
            )}
            {r.status === 'acknowledged' && (
              <>
                <Button className="mt-4 w-full" icon="handshake" onClick={() => setStatus('in_progress')}>{t('lh.onWayBtn')}</Button>
                <p className="mt-2 text-muted">{t('lh.onWayHint')}</p>
              </>
            )}
            <Button variant="secondary" className="mt-3 w-full" onClick={() => setClosing(true)}>{t('lh.closeBtn')}</Button>
            {err && <p className="mt-2 font-semibold text-danger-ink">{t(err)}</p>}
          </Card>
        )}
        {r.status === 'resolved' && (
          <Card className="p-5 text-lg">
            {r.resolved_by === 'pilgrim' ? t('lh.closedByPilgrim') : t('lh.closedNote', { note: r.resolution_note ?? '—' })}
          </Card>
        )}

        <Card className="p-5">
          <h2 className="text-xl font-bold">{t('lh.location')}</h2>
          {loc ? (
            <>
              <div className="mt-3 flex items-center gap-3 rounded-[var(--radius-btn)] bg-neutral-soft px-4 py-4">
                <Icon name="mapPin" className="size-6 shrink-0 text-primary" />
                <span dir="ltr" className="flex-1 font-semibold">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</span>
                <a href={mapsUrl(loc.lat, loc.lng)} target="_blank" rel="noreferrer" className="font-bold text-primary">{t('lh.openMap')}</a>
              </div>
              <p className="mt-2 text-muted">{t('lh.locNote')}{loc.at ? ` · ${fmtTime(loc.at, lang, t)}` : ''}</p>
            </>
          ) : <p className="mt-2 text-muted">{t('lh.noLoc')}</p>}
        </Card>

        <InfoCard>
          {r.note && <InfoRow label={t('lh.note')}>{r.note}</InfoRow>}
          <InfoRow label={t('lh.times')}>
            <span className="text-base font-semibold">
              {t('help.createdOnDevice', { time: fmtDayTime(r.created_at, lang, t) })}
              {r.received_at && <> · {t('help.received', { time: fmtTime(r.received_at, lang, t) })}</>}
            </span>
          </InfoRow>
        </InfoCard>
      </div>

      <BottomSheet open={closing} onClose={() => setClosing(false)} title={t('lh.closeTitle')}>
        <div className="mt-3 flex flex-col gap-3">
          <Button variant="secondary" onClick={() => close('lh.reason1')}>{t('lh.reason1')}</Button>
          <Button variant="secondary" onClick={() => close('lh.reason2')}>{t('lh.reason2')}</Button>
          <button onClick={() => setClosing(false)} className="py-3 text-lg font-bold text-primary underline underline-offset-4">{t('lh.cancel')}</button>
        </div>
      </BottomSheet>
    </Screen>
  )
}

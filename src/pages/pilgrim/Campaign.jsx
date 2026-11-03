import { useState } from 'react'
import Icon from '../../components/Icon'
import { Card, Screen, TopBar } from '../../components/Layout'
import { useI18n } from '../../i18n'
import { useSession } from '../../lib/session'
import TextSizeControl from '../../components/TextSizeControl'
import { Button } from '../../components/ui'
import { useOnline } from '../../lib/useOnline'
import { fmtDayTime, fmtPhone } from '../../lib/format'

function Row({ icon, label, children, action }) {
  return (
    <li className="flex items-center gap-3.5 py-3.5">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-neutral-soft text-muted">
        <Icon name={icon} className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-muted">{label}</div>
        <div className="text-lg font-bold leading-snug">{children || '—'}</div>
      </div>
      {action}
    </li>
  )
}

// Design 15 — my campaign info. Works offline from the localStorage cache (session).
export default function Campaign() {
  const { t, lang } = useI18n()
  const { campaign: c, syncedAt, refreshMembership, signOut } = useSession()
  const online = useOnline()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function refresh() {
    setBusy(true); setFailed(false)
    try { await refreshMembership() } catch (e) { console.warn(e); setFailed(true) }
    setBusy(false)
  }

  const tel = c?.leader_phone ? `tel:${c.leader_phone.replace(/\s+/g, '')}` : null
  const assembly = [c?.assembly_point, c?.assembly_time && fmtDayTime(c.assembly_time, lang, t)].filter(Boolean).join(' · ')

  return (
    <Screen>
      <TopBar title={t('campaign.title')} back="/p" />
      <div className="flex flex-col gap-4 px-4 py-5">
        {!online && (
          <p className="flex items-center gap-2 rounded-2xl bg-neutral-soft px-4 py-3 font-semibold">
            <Icon name="wifiOff" className="size-5 shrink-0" />{t('campaign.offlineNote')}
          </p>
        )}

        <Card className="px-4 pt-4">
          <div className="flex items-center gap-3.5 pb-1">
            <span className="grid size-14 place-items-center rounded-xl bg-sand-soft text-sand-ink"><Icon name="users" className="size-7" /></span>
            <h2 className="text-2xl font-bold">{c?.name}</h2>
          </div>
          <ul className="divide-y divide-line">
            <Row icon="user" label={t('campaign.leader')} action={tel && (
              <a href={tel} aria-label={t('campaign.call')}
                className="grid size-14 shrink-0 place-items-center rounded-2xl border-2 border-line-strong text-ink active:bg-neutral-soft">
                <Icon name="phone" className="size-6" />
              </a>
            )}>{c?.leader_name}</Row>
            <Row icon="phone" label={t('campaign.phone')}>
              {tel ? <a href={tel} dir="ltr" className="inline-block">{fmtPhone(c.leader_phone)}</a> : null}
            </Row>
            <Row icon="building" label={t('campaign.hotel')}>{c?.hotel}</Row>
            <Row icon="tent" label={t('campaign.camp')}>{c?.camp}</Row>
            <Row icon="flag" label={t('campaign.assembly')}>{assembly}</Row>
          </ul>
        </Card>

        <Card className="px-4">
          <ul className="divide-y divide-line">
            <Row icon="clock" label={t('campaign.updatedByLeader')}>{fmtDayTime(c?.updated_at, lang, t)}</Row>
            <Row icon="refresh" label={t('campaign.lastSync')}>{syncedAt ? fmtDayTime(syncedAt, lang, t) : t('campaign.never')}</Row>
          </ul>
        </Card>

        <button onClick={refresh} disabled={busy || !online}
          className="flex items-center justify-center gap-2.5 rounded-2xl border-2 border-line-strong bg-white py-4 text-lg font-bold disabled:opacity-50">
          <Icon name="refresh" className={`size-6 ${busy ? 'animate-spin' : ''}`} />
          {busy ? t('campaign.refreshing') : t('campaign.refresh')}
        </button>
        {failed && <p className="rounded-xl bg-danger-soft px-4 py-3 font-semibold text-danger-ink">{t('campaign.refreshFailed')}</p>}

        {/* settings (merged here — screen 33; restyled fully in phase 4) */}
        <TextSizeControl />
        <Button variant="secondary" icon="logOut" iconClass="size-5 ltr:-scale-x-100"
          onClick={() => confirm(t('common.signOutConfirm')) && signOut()}>{t('common.signOut')}</Button>
      </div>
    </Screen>
  )
}

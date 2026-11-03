import { useState } from 'react'
import BottomNav, { PILGRIM_NAV } from '../../components/BottomNav'
import Icon from '../../components/Icon'
import { Card, Screen, TopBar } from '../../components/Layout'
import { useI18n } from '../../i18n'
import { getLocationOnce, HELP_TYPES, useHelpRequests } from '../../lib/helpRequests'
import { useOnline } from '../../lib/useOnline'
import { fmtDayTime } from '../../lib/format'

// Status chip for one of my requests: local queue state first, then the leader's status.
export function RequestStatus({ r }) {
  const { t } = useI18n()
  if (r.state === 'queued') return <Chip icon="clock" cls="bg-chip text-ink">{t('help.queued')}</Chip>
  if (r.state === 'sending') return <Chip icon="refresh" cls="bg-chip text-ink" spin>{t('help.sending')}</Chip>
  const s = r.server?.status
  if (s === 'in_progress') return <Chip icon="handshake" cls="bg-cream text-gold-ink">{t('help.in_progress')}</Chip>
  if (s === 'resolved') return <Chip icon="checkCircle" cls="bg-mint text-success">{t('help.resolved')}</Chip>
  return <Chip icon="check" cls="bg-mint text-mint-ink">{t('help.sent')}{s === 'open' ? ` · ${t('help.open')}` : ''}</Chip>
}
function Chip({ icon, cls, spin, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${cls}`}>
      <Icon name={icon} className={`size-4 ${spin ? 'animate-spin' : ''}`} />{children}
    </span>
  )
}

// Feature 7 — help request that works offline (queued on the device, auto-sent later).
export default function Help() {
  const { t, lang } = useI18n()
  const online = useOnline()
  const { requests, submit } = useHelpRequests()
  const [type, setType] = useState(null)
  const [note, setNote] = useState('')
  const [share, setShare] = useState(false)
  const [busy, setBusy] = useState(false)
  const [noLoc, setNoLoc] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  async function onSubmit() {
    if (!type) return
    setBusy(true); setNoLoc(false)
    let loc = null
    if (share) { loc = await getLocationOnce(); if (!loc) setNoLoc(true) }
    submit({ type, note, ...(loc ?? {}) })
    setBusy(false); setType(null); setNote(''); setShare(false); setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 4000)
  }

  return (
    <Screen nav={<BottomNav items={PILGRIM_NAV} />}>
      <TopBar title={t('help.title')} back="/p" />
      <div className="flex flex-col gap-4 px-4 py-5">
        {!online && (
          <p className="flex items-start gap-2 rounded-2xl bg-chip px-4 py-3 font-semibold">
            <Icon name="wifiOff" className="mt-0.5 size-5 shrink-0" />{t('help.offlineHint')}
          </p>
        )}

        <section>
          <h2 className="mb-2 text-lg font-bold">{t('help.whatType')}</h2>
          <div className="grid grid-cols-3 gap-3">
            {HELP_TYPES.map((h) => (
              <button key={h.type} type="button" onClick={() => setType(h.type)} aria-pressed={type === h.type}
                className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 bg-white p-3 text-center font-bold leading-snug
                  ${type === h.type ? 'border-navy-800 ring-2 ring-navy-800/20' : 'border-line'}`}>
                <span className={`grid size-12 place-items-center rounded-xl ${h.tone}`}><Icon name={h.icon} className="size-6" /></span>
                {t(`help.${h.type}`)}
              </button>
            ))}
          </div>
        </section>

        <label className="block">
          <span className="mb-2 block text-lg font-bold">{t('help.note')}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t('help.notePh')}
            className="w-full resize-none rounded-2xl border border-line-strong/60 bg-white px-4 py-3 text-lg outline-none focus:border-navy-800" />
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white p-4">
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-1 size-5 accent-navy-800" />
          <span>
            <span className="block font-bold">{t('help.shareLocation')}</span>
            <span className="text-sm text-muted">{t('help.shareHint')}</span>
          </span>
        </label>

        <button onClick={onSubmit} disabled={!type || busy}
          className="flex items-center justify-center gap-2.5 rounded-2xl bg-danger py-4 text-xl font-bold text-white disabled:opacity-50">
          <Icon name="send" className="size-6 rtl:-scale-x-100" />{busy && share ? t('help.locating') : t('help.submit')}
        </button>
        {savedMsg && (
          <p className="flex items-center gap-2 rounded-xl bg-mint px-4 py-3 font-bold text-mint-ink">
            <Icon name="checkCircle" className="size-5" />{t('help.saved')}
          </p>
        )}
        {noLoc && <p className="text-sm font-semibold text-warn-ink">{t('help.noLocation')}</p>}

        <section className="mt-2">
          <h2 className="mb-2 text-lg font-bold">{t('help.mine')}</h2>
          {requests.length === 0 && <p className="py-4 text-center text-muted">{t('help.none')}</p>}
          <div className="flex flex-col gap-3">
            {requests.map((r) => (
              <Card key={r.client_id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{t(`help.${r.type}`)}</span>
                  <RequestStatus r={r} />
                </div>
                {r.note && <p className="mt-1.5 text-muted">{r.note}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span>{t('help.created', { time: fmtDayTime(r.created_at, lang, t) })}</span>
                  {r.location_shared && <span className="flex items-center gap-1"><Icon name="flag" className="size-4" />{t('help.sharedLocation')}</span>}
                </div>
                {r.state === 'queued' && <p className="mt-1.5 text-sm font-semibold text-warn-ink">{t('help.queuedHint')}</p>}
              </Card>
            ))}
          </div>
        </section>
      </div>
    </Screen>
  )
}

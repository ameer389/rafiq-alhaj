import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { isArrival } from '../lib/arrival'
import Icon from './Icon'
import { isRtl, useI18n } from '../i18n'
import { messageText, usePilgrimMessages } from '../lib/pilgrimMessages'
import { fmtTime } from '../lib/format'

function MsgText({ m, className = '' }) {
  const { lang } = useI18n()
  const text = messageText(m, lang)
  const shownLang = text === m.original_text ? 'ar' : lang
  return (
    <p dir={isRtl(shownLang) ? 'rtl' : 'ltr'} lang={shownLang}
      className={`leading-relaxed ${shownLang === 'ur' ? 'font-urdu' : ''} ${className}`}>{text}</p>
  )
}

// Unconfirmed arrival check on pilgrim home: one big "وصلت" tap, no navigation needed.
function ArrivalCard({ m }) {
  const { t, lang } = useI18n()
  const { ack } = usePilgrimMessages()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  async function onArrived() {
    setBusy(true); setFailed(false)
    try { await ack(m.id) } catch (e) { console.error(e); setFailed(true) }
    setBusy(false)
  }
  return (
    <div className="rounded-[var(--radius-card)] border-2 border-primary/40 bg-primary-soft p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon name="userCheck" className="size-5 text-primary" />
        <span className="font-bold text-primary">{t('arrival.title')}</span>
        <span className="ms-auto text-sm text-muted">{fmtTime(m.created_at, lang, t)}</span>
      </div>
      <MsgText m={m} className="text-lg font-semibold" />
      <button onClick={onArrived} disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary py-4 text-2xl font-bold text-white disabled:opacity-60">
        <Icon name="check" className="size-7" strokeWidth={2.5} />{t('arrival.arrived')}
      </button>
      {failed && <p className="mt-2 text-sm font-semibold text-danger-ink">{t('msg.ackFailed')}</p>}
    </div>
  )
}

// Design 04 — "آخر إعلان من القائد" card on pilgrim home.
export function LatestMessageCard({ m }) {
  const { t, lang } = useI18n()
  const { acked } = usePilgrimMessages()
  const unread = !acked.has(m.id)
  if (unread && isArrival(m)) return <ArrivalCard m={m} />
  return (
    <Link to={`/p/m/${m.id}`}
      className={`block rounded-[var(--radius-card)] border p-4 ${unread ? 'border-sand-line bg-sand-soft ring-2 ring-sand/40' : 'border-line bg-white'}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon name="megaphone" className="size-5 text-sand-ink" />
        <span className="font-bold text-sand-ink">{isArrival(m) ? t('arrival.title') : unread ? t('msg.newBanner') : t('msg.latest')}</span>
        {unread && <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">{t('msg.isNew')}</span>}
        <span className="ms-auto text-sm text-muted">{fmtTime(m.created_at, lang, t)}</span>
      </div>
      <MsgText m={m} className="text-lg" />
      {unread && (
        <span className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white">
          {t('msg.read')}<Icon name="chevronLeft" className="size-5 ltr:-scale-x-100" />
        </span>
      )}
    </Link>
  )
}

// Floating banner when a message arrives live (shown on every pilgrim screen except home & the message itself).
export function IncomingBanner() {
  const { t } = useI18n()
  const { incoming, dismissIncoming } = usePilgrimMessages()
  const { pathname } = useLocation()
  if (!incoming || pathname === '/p' || pathname.startsWith('/p/m/')) return null
  return (
    <div className="fixed inset-x-0 top-3 z-30 mx-auto w-full max-w-[430px] px-3">
      <Link to={`/p/m/${incoming.id}`} onClick={dismissIncoming}
        className="flex items-center gap-3 rounded-2xl bg-primary-dark p-4 text-white shadow-xl">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sand text-primary-dark"><Icon name="megaphone" className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="font-bold">{t(isArrival(incoming) ? 'arrival.title' : 'msg.newBanner')}</div>
          <MsgText m={incoming} className="truncate text-white/80" />
        </div>
      </Link>
    </div>
  )
}

export function MessageListItem({ m }) {
  const { t, lang } = useI18n()
  const { acked } = usePilgrimMessages()
  const unread = !acked.has(m.id)
  return (
    <Link to={`/p/m/${m.id}`} className="block rounded-[var(--radius-card)] border border-line bg-white p-4">
      <div className="mb-1 flex items-center gap-2 text-sm text-muted">
        {unread ? <span className="size-2.5 rounded-full bg-danger" /> : <Icon name="checkCircle" className="size-4 text-primary" />}
        <span>{fmtTime(m.created_at, lang, t)}</span>
        {m.priority !== 'normal' && <span className="font-bold text-sand-ink">· {t(`priority.${m.priority}`)}</span>}
      </div>
      <MsgText m={m} className={unread ? 'font-bold' : ''} />
    </Link>
  )
}

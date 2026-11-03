import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { isArrival } from '../lib/arrival'
import Icon from './Icon'
import { isRtl, useI18n } from '../i18n'
import { isTranslated, messageText, usePilgrimMessages } from '../lib/pilgrimMessages'
import { fmtTime } from '../lib/format'
import { useSpeech } from '../lib/useSpeech'
import { Button, Chip, IconCircle } from './ui'

function MsgText({ m, className = '' }) {
  const { lang } = useI18n()
  const text = messageText(m, lang)
  const shownLang = text === m.original_text ? 'ar' : lang
  return (
    <p dir={isRtl(shownLang) ? 'rtl' : 'ltr'} lang={shownLang}
      className={`leading-relaxed ${shownLang === 'ur' ? 'font-urdu' : 'font-sans'} ${className}`}>{text}</p>
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
    <div className="rounded-[var(--radius-card)] border border-primary-line bg-primary-soft p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon name="userCheck" className="size-5 text-primary" />
        <span className="font-bold text-primary">{t('arrival.title')}</span>
        <span className="ms-auto text-sm text-muted">{fmtTime(m.created_at, lang, t)}</span>
      </div>
      <MsgText m={m} className="text-lg font-semibold" />
      <button onClick={onArrived} disabled={busy}
        className="mt-4 flex min-h-[3.75rem] w-full items-center justify-center gap-2.5 rounded-[var(--radius-btn)] bg-primary text-xl font-bold text-white disabled:opacity-60">
        <Icon name="check" className="size-7" strokeWidth={2.5} />{t('arrival.arrived')}
      </button>
      {failed && <p className="mt-2 text-sm font-semibold text-danger-ink">{t('msg.ackFailed')}</p>}
    </div>
  )
}

// Screens 09 / 34 / 35 / 36 — "رسالة من قائدك": avatar, title, time, text in my language,
// «استمع», «النص الأصلي» (shows the Arabic in a neutral box, 36), and «فهمت» while unconfirmed
// (our core loop: the leader's live "understood" counter).
export function MessageCard({ m, showAck = true, highlight = true }) {
  const { t, lang } = useI18n()
  const { acked, ack } = usePilgrimMessages()
  const { available, speaking, speak, stop } = useSpeech(lang)
  const [showOriginal, setShowOriginal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const unread = !acked.has(m.id)
  if (unread && isArrival(m) && showAck) return <ArrivalCard m={m} />
  const translated = isTranslated(m, lang)

  async function onAck() {
    setBusy(true); setFailed(false)
    try { await ack(m.id) } catch (e) { console.error(e); setFailed(true) }
    setBusy(false)
  }

  return (
    <article className={`rounded-[var(--radius-card)] border bg-surface p-5 ${unread && highlight ? 'border-primary-line ring-2 ring-primary/15' : 'border-line'}`}>
      <Link to={`/p/m/${m.id}`} className="block">
        <div className="flex items-center gap-3">
          <IconCircle icon="user" size="size-12" iconSize="size-6" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-bold">{isArrival(m) ? t('arrival.title') : t('home.msgFromLeader')}</span>
              {unread && <Chip tone="primary" className="!py-1 text-sm">{t('msg.isNew')}</Chip>}
            </div>
            <div className="text-muted">{fmtTime(m.created_at, lang, t)}</div>
          </div>
        </div>
        <MsgText m={m} className="mt-4 text-lg" />
        {lang !== 'ar' && !translated && !isArrival(m) && <p className="mt-2 text-sm text-muted">{t('msg.untranslatedNote')}</p>}
      </Link>

      {translated && showOriginal && (
        <div className="mt-3 rounded-[var(--radius-btn)] bg-neutral-soft px-4 py-3">
          <div className="text-muted">{t('msg.original')}</div>
          <p dir="rtl" lang="ar" className="mt-1 font-sans text-lg leading-relaxed">{m.original_text}</p>
        </div>
      )}

      {(available || translated) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {available && (
            <Button variant="soft" size="pill" icon={speaking ? 'x' : 'volume'} iconClass="size-5 rtl:-scale-x-100"
              onClick={() => (speaking ? stop() : speak(messageText(m, lang)))}>
              {speaking ? t('msg.stop') : t('msg.listen')}
            </Button>
          )}
          {translated && (
            <button type="button" onClick={() => setShowOriginal((v) => !v)} aria-expanded={showOriginal}
              className="py-2 text-lg font-bold text-primary">
              {showOriginal ? t('msg.hideOriginal') : t('msg.originalText')}
            </button>
          )}
        </div>
      )}

      {showAck && unread && (
        <Button icon="check" className="mt-4 w-full" onClick={onAck} disabled={busy}>{t('msg.gotIt')}</Button>
      )}
      {failed && <p className="mt-2 font-semibold text-danger-ink">{t('msg.ackFailed')}</p>}
    </article>
  )
}
/** old name */
export const LatestMessageCard = MessageCard

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

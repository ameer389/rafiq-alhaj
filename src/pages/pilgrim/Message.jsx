import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Screen, TopBar } from '../../components/Layout'
import { isRtl, useI18n } from '../../i18n'
import { useSession } from '../../lib/session'
import { isTranslated, messageText, usePilgrimMessages } from '../../lib/pilgrimMessages'
import { useSpeech } from '../../lib/useSpeech'
import { fmtTime } from '../../lib/format'
import { PRIORITY_STYLE } from '../leader/Messages'
import AssemblyCard from '../../components/AssemblyCard'
import { isArrival } from '../../lib/arrival'

// Designs 09 (English) / 10 (Urdu) / 11 (Arabic) — leader message in the pilgrim's language.
export default function Message() {
  const { id } = useParams()
  const { t, lang } = useI18n()
  const { campaign } = useSession()
  const { messages, acked, leaders, ack } = usePilgrimMessages()
  const { available, speaking, speak, stop } = useSpeech(lang)
  const [showOriginal, setShowOriginal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ackError, setAckError] = useState(false)

  const m = messages.find((x) => x.id === id)
  if (!m) {
    return (
      <Screen>
        <TopBar title={t('msg.title')} back="/p" />
        <p className="py-16 text-center text-muted">{t('msg.notFound')}</p>
      </Screen>
    )
  }

  const text = messageText(m, lang)
  const translated = isTranslated(m, lang)
  const done = acked.has(m.id)
  const arrival = isArrival(m)
  const sender = leaders[m.sender_id] ?? campaign?.leader_name ?? ''

  async function onAck() {
    setBusy(true); setAckError(false)
    try { await ack(m.id) } catch (e) { console.error(e); setAckError(true) }
    setBusy(false)
  }

  return (
    <Screen>
      <TopBar title={t(arrival ? 'arrival.title' : 'msg.title')} back="/p" />

      <div className="flex flex-col gap-3 px-4 py-5">
        <article className="rounded-[var(--radius-card)] border border-gold-line bg-cream p-5">
          <div className="flex flex-wrap items-center gap-2.5 font-semibold text-muted">
            <span className="grid size-9 place-items-center rounded-full bg-gold text-navy-900"><Icon name="user" className="size-5" /></span>
            <span>{sender} · {t('msg.leaderRole')}</span>
            {m.priority !== 'normal' && (
              <span className={`ms-auto rounded-full px-3 py-0.5 text-sm font-bold ${PRIORITY_STYLE[m.priority]}`}>{t(`priority.${m.priority}`)}</span>
            )}
          </div>

          <p dir={translated ? (isRtl(lang) ? 'rtl' : 'ltr') : 'rtl'} lang={translated ? lang : 'ar'}
            className={`mt-4 text-[1.6rem] font-bold leading-relaxed ${translated && lang === 'ur' ? 'font-urdu font-semibold' : ''}`}>
            {text}
          </p>

          {translated && (
            <>
              <hr className="my-4 border-gold-line" />
              <div className="flex items-center gap-2 text-muted">
                <Icon name="languages" className="size-5" />{t('msg.translatedFrom')}
              </div>
              <button onClick={() => setShowOriginal((v) => !v)}
                className="mt-3 font-bold text-mint-ink underline underline-offset-4">
                {showOriginal ? t('msg.hideOriginal') : t('msg.showOriginal')}
              </button>
              {showOriginal && (
                <div className="mt-3 rounded-xl bg-white/70 p-3">
                  <div className="mb-1 text-sm text-muted">{t('msg.original')}</div>
                  <p dir="rtl" lang="ar" className="text-lg leading-relaxed">{m.original_text}</p>
                </div>
              )}
            </>
          )}
        </article>

        {arrival && <AssemblyCard campaign={campaign} />}

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => (speaking ? stop() : speak(text))} disabled={!available}
            className="flex items-center gap-2 rounded-2xl border-2 border-line-strong bg-white px-5 py-3 text-lg font-bold disabled:opacity-40">
            <Icon name={speaking ? 'x' : 'volume'} className="size-6 rtl:-scale-x-100" />
            {speaking ? t('msg.stop') : t('msg.listen')}
          </button>
          {!available && <span className="flex-1 text-sm text-muted">{t('msg.noVoice')}</span>}
        </div>
        <div className="text-muted">{fmtTime(m.created_at, lang, t)}</div>

        {done ? (
          <div className="flex items-center justify-center gap-2.5 rounded-2xl bg-mint py-5 text-xl font-bold text-mint-ink">
            <Icon name="checkCircle" className="size-7" />{t(arrival ? 'arrival.confirmed' : 'msg.confirmed')}
          </div>
        ) : (
          <button onClick={onAck} disabled={busy}
            className={`flex items-center justify-center gap-3 rounded-2xl py-5 text-2xl font-bold text-white disabled:opacity-60
              ${arrival ? 'bg-success' : 'bg-navy-800'}`}>
            <Icon name="check" className="size-7" strokeWidth={2.5} />{t(arrival ? 'arrival.arrived' : 'msg.gotIt')}
          </button>
        )}
        {ackError && <p className="rounded-xl bg-danger-soft px-4 py-3 font-semibold text-danger-ink">{t('msg.ackFailed')}</p>}
      </div>
    </Screen>
  )
}

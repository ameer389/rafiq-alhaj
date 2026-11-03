import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AckCounter from '../../components/AckCounter'
import BottomNav, { LEADER_NAV } from '../../components/BottomNav'
import LeaderHeader from '../../components/LeaderHeader'
import { Screen } from '../../components/Layout'
import { BottomSheet, Button, Chip, Notice } from '../../components/ui'
import Segmented from '../../components/Segmented'
import { isRtl, langLabel, useI18n } from '../../i18n'
import { isAuthError, useSession } from '../../lib/session'
import { ackStats, arrivalStats, useLeaderData } from '../../lib/leaderData'
import { isArrival, recipientsOf, translationLangs } from '../../lib/arrival'
import { supabase } from '../../lib/supabase'
import { translateText } from '../../lib/translate'
import { TEMPLATES } from '../../lib/templates'
import { useToast } from '../../lib/toast'
import { fmtNum, fmtTime } from '../../lib/format'

const ALL_TARGETS = ['ur', 'en', 'id']
const DEBOUNCE_MS = 1200

// Kept for older imports (priority chips).
export const PRIORITY_STYLE = {
  normal: 'bg-neutral-soft text-muted',
  important: 'bg-sand-soft text-sand-ink',
  urgent: 'bg-danger-soft text-danger-ink',
}

// Screens 50 (compose + translation preview + ready templates), 51 (honest "arrives in Arabic"),
// 52 (confirm before sending), and the sent list with the live «فهموا» counter (our core loop).
export default function Messages() {
  const { t, lang } = useI18n()
  const toast = useToast()
  const { member } = useSession()
  const { pilgrims, messages, acks, addMessage } = useLeaderData()
  const [params, setParams] = useSearchParams()
  const oneId = params.get('to')
  const one = oneId ? pilgrims.find((p) => p.id === oneId) : null
  const arrival = arrivalStats(messages, acks, pilgrims)
  const [to, setTo] = useState('all') // all | notConfirmed (| one via ?to=)
  const audience = one ? [one] : to === 'notConfirmed' && arrival.latest ? arrival.pending : pilgrims
  const targets = useMemo(() => {
    const present = ALL_TARGETS.filter((l) => audience.some((p) => p.lang === l))
    return present.length ? present : ALL_TARGETS
  }, [audience])

  const [text, setText] = useState('')
  const [tr, setTr] = useState(null) // { ur, en, id } | null
  const [source, setSource] = useState(null) // template | auto
  const [status, setStatus] = useState('idle') // idle | translating | failed
  const [fallback, setFallback] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState(null)
  const reqId = useRef(0)
  const trimmed = text.trim()

  // Auto-translate free text after a short pause (templates already carry their translations).
  useEffect(() => {
    if (source !== 'auto' || !trimmed) return
    const my = ++reqId.current
    setStatus('translating')
    const timer = setTimeout(async () => {
      try {
        const { translations, fallback: fb } = await translateText(trimmed, ALL_TARGETS)
        if (my !== reqId.current) return
        setTr(Object.fromEntries(ALL_TARGETS.map((l) => [l, typeof translations[l] === 'string' ? translations[l] : ''])))
        setFallback(fb); setStatus('idle')
      } catch (e) {
        if (my !== reqId.current) return
        console.warn('translate failed', e); setTr(null); setStatus('failed')
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [trimmed, source])

  function onType(v) { setText(v); setSource('auto'); setErr(null); if (!v.trim()) { setTr(null); setStatus('idle') } }
  function applyTemplate(tp) {
    reqId.current++ // cancel a pending auto-translation
    setText(tp.text.ar); setTr({ ur: tp.text.ur, en: tp.text.en, id: tp.text.id }); setSource('template')
    setStatus('idle'); setFallback(false); setErr(null)
  }

  async function send() {
    setSending(true); setErr(null)
    const final = { ar: trimmed }
    for (const l of ALL_TARGETS) if (tr?.[l]?.trim()) final[l] = tr[l].trim()
    if (one || to === 'notConfirmed') final._to = audience.map((p) => p.id) // recipients subset (no schema change)
    const { data, error, status: http } = await supabase.from('messages').insert({
      campaign_id: member.campaign_id, sender_id: member.id, original_text: trimmed,
      translations: final, priority: 'normal', kind: 'announcement',
    }).select().single()
    setSending(false); setConfirm(false)
    if (error) { console.error(error); setErr(isAuthError(error, http) ? 'newMsg.leaderSessionEnded' : 'newMsg.sendFailed'); return }
    addMessage(data)
    setText(''); setTr(null); setSource(null); setStatus('idle'); setFallback(false)
    if (one) setParams({}, { replace: true })
    toast(t('newMsg.sent'))
  }

  const confirmTitle = one ? t('lm.confirmOne', { name: one.name })
    : to === 'notConfirmed' ? t('lm.confirmNot', { n: fmtNum(audience.length, lang) })
    : t('lm.confirmAll', { n: fmtNum(audience.length, lang) })

  return (
    <Screen nav={<BottomNav items={LEADER_NAV} />}>
      <LeaderHeader />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <h1 className="text-[1.75rem] font-bold">{t('lm.title')}</h1>

        {one ? (
          <div><Chip tone="primary" icon="user">{t('lm.toOne', { name: one.name })}</Chip>
            <button onClick={() => setParams({}, { replace: true })} className="ms-3 font-bold text-primary">{t('lh.cancel')}</button></div>
        ) : (
          <Segmented value={arrival.latest ? to : 'all'} onChange={setTo} options={[
            { value: 'all', label: t('lm.toAll', { n: fmtNum(pilgrims.length, lang) }) },
            { value: 'notConfirmed', label: t('lm.toNotConfirmed', { n: arrival.latest ? fmtNum(arrival.pending.length, lang) : '—' }), disabled: !arrival.latest || !arrival.pending.length },
          ]} />
        )}

        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((tp) => (
            <button key={tp.id} type="button" onClick={() => applyTemplate(tp)}
              className="min-h-12 rounded-full border border-line-strong bg-surface px-5 text-lg font-bold">{t(tp.label)}</button>
          ))}
        </div>

        <textarea value={text} onChange={(e) => onType(e.target.value)} dir="rtl" lang="ar" rows={4}
          placeholder={t('lm.placeholder')}
          className="w-full resize-none rounded-[var(--radius-card)] border border-line-strong bg-surface px-5 py-4 font-sans text-xl leading-relaxed outline-none focus:border-primary" />

        {trimmed && status === 'failed' && <Notice tone="sand">{t('lm.untranslated')}</Notice>}
        {trimmed && status === 'translating' && !tr && <p className="text-muted">{t('newMsg.translating')}</p>}
        {trimmed && tr && status !== 'failed' && (
          <section className="flex flex-col gap-3">
            <h2 className="font-bold text-muted">
              {t(source === 'template' ? 'lm.previewReady' : 'lm.preview')}{status === 'translating' ? ' …' : ''}
            </h2>
            {fallback && <Notice tone="sand" icon="info" className="text-sm">{t('newMsg.fallbackNote')}</Notice>}
            {targets.map((l) => (
              <label key={l} className="block rounded-[var(--radius-card)] bg-neutral-soft px-5 py-3">
                <span className="block text-muted">{langLabel(l)}</span>
                <textarea value={tr[l] ?? ''} rows={2} onChange={(e) => setTr((x) => ({ ...x, [l]: e.target.value }))}
                  dir={isRtl(l) ? 'rtl' : 'ltr'} lang={l}
                  className={`mt-1 w-full resize-none bg-transparent text-lg leading-relaxed outline-none ${l === 'ur' ? 'font-urdu' : 'font-sans'}`} />
              </label>
            ))}
          </section>
        )}

        {err && <Notice tone="danger">{t(err)}</Notice>}
        <Button onClick={() => setConfirm(true)} disabled={!trimmed || sending}>{t('lm.send')}</Button>

        <h2 className="mt-4 text-lg font-bold text-muted">{t('lm.sentTitle')}</h2>
        {messages === null && <p className="text-muted">{t('common.loading')}</p>}
        {messages?.map((m) => <SentCard key={m.id} m={m} acks={acks} pilgrims={pilgrims} />)}
      </div>

      <BottomSheet open={confirm} onClose={() => !sending && setConfirm(false)} title={confirmTitle}>
        <p className="text-lg text-muted">{t('lm.confirmBody')}</p>
        <div className="mt-5 flex flex-col gap-3">
          <Button onClick={send} disabled={sending}>{sending ? t('newMsg.sending') : t('lm.send')}</Button>
          <Button variant="secondary" onClick={() => setConfirm(false)} disabled={sending}>{t('lm.edit')}</Button>
        </div>
      </BottomSheet>
    </Screen>
  )
}

function SentCard({ m, acks, pilgrims }) {
  const { t, lang } = useI18n()
  const { count, total } = ackStats(m, acks, pilgrims)
  const sub = recipientsOf(m)
  const arrival = isArrival(m)
  const translated = translationLangs(m).length > 0
  return (
    <Link to={`/l/m/${m.id}`} className="block rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <p dir="rtl" className="font-sans text-lg leading-relaxed">{m.original_text}</p>
      <p className="mt-2 text-muted">
        {sub ? t('lm.toSubsetShort', { n: fmtNum(sub.length, lang) }) : t('lm.toAllShort')} · {fmtTime(m.created_at, lang, t)}
      </p>
      <div className="mt-2">
        <Chip tone="neutral">{arrival ? t('arrival.title') : t(translated ? 'lm.sentTranslated' : 'lm.sentArabicOnly')}</Chip>
      </div>
      <div className="mt-3"><AckCounter count={count} total={total} label={arrival ? 'arrival.label' : 'acks.understood'} /></div>
    </Link>
  )
}

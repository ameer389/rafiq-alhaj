import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import Segmented from '../../components/Segmented'
import { Screen, TopBar } from '../../components/Layout'
import { isRtl, langLabel, useI18n } from '../../i18n'
import { isAuthError, useSession } from '../../lib/session'
import { useMembers } from '../../lib/useMembers'
import { supabase } from '../../lib/supabase'
import { translateText } from '../../lib/translate'

const ALL_TARGETS = ['ur', 'en', 'id']

// Design 18 — leader writes Arabic → auto-translate preview (editable) → send.
export default function NewMessage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { member, campaign, refreshMembership, signOut } = useSession()
  const { pilgrims } = useMembers(campaign?.id)

  const [text, setText] = useState('')
  const [priority, setPriority] = useState('normal')
  const [translations, setTranslations] = useState(null) // { ur, en, id } once previewed
  const [translatedFrom, setTranslatedFrom] = useState('')
  const [status, setStatus] = useState('idle') // idle | translating | failed | sending
  const [sendError, setSendError] = useState(null) // i18n key

  // Languages actually used in this campaign (+ member counts), Arabic excluded.
  const langCounts = useMemo(() => {
    const c = {}
    for (const p of pilgrims) if (p.lang !== 'ar') c[p.lang] = (c[p.lang] ?? 0) + 1
    return c
  }, [pilgrims])
  const targets = useMemo(() => {
    const present = ALL_TARGETS.filter((l) => langCounts[l])
    return present.length ? present : ALL_TARGETS
  }, [langCounts])

  const trimmed = text.trim()
  const stale = translations && translatedFrom !== trimmed

  async function runTranslate() {
    if (!trimmed) return
    setStatus('translating')
    try {
      const tr = await translateText(trimmed, targets)
      setTranslations(Object.fromEntries(targets.map((l) => [l, tr[l] ?? ''])))
      setStatus('idle')
    } catch (e) {
      console.warn('translate failed', e)
      // Never block sending: open empty editable fields (keep any previous edits).
      setTranslations((prev) => prev ?? Object.fromEntries(targets.map((l) => [l, ''])))
      setStatus('failed')
    }
    setTranslatedFrom(trimmed)
  }

  async function send() {
    if (!trimmed) return
    setStatus('sending'); setSendError(null)
    const final = { ar: trimmed }
    for (const [l, v] of Object.entries(translations ?? {})) if (v.trim()) final[l] = v.trim()
    const { error, status: httpStatus } = await supabase.from('messages').insert({
      campaign_id: member.campaign_id, sender_id: member.id,
      original_text: trimmed, translations: final, priority, kind: 'announcement',
    })
    if (error) {
      console.error(error)
      setStatus('idle')
      if (isAuthError(error, httpStatus)) {
        // Rejected by RLS: is this browser session still the leader? (another tab may have re-joined)
        const fresh = await refreshMembership({ apply: false }).catch(() => null)
        setSendError(fresh?.role === 'leader' ? 'newMsg.sendFailed' : 'newMsg.leaderSessionEnded')
      } else {
        setSendError('newMsg.sendFailed')
      }
      return
    }
    navigate('/l/messages', { state: { sent: true } })
  }

  const busy = status === 'translating' || status === 'sending'
  const needsPreview = !translations

  return (
    <Screen>
      <TopBar title={t('newMsg.title')} close="/l" />

      <div className="flex flex-col gap-4 px-4 pb-32 pt-5">
        <section>
          <h2 className="mb-2 text-lg font-bold">{t('newMsg.to')}</h2>
          <Segmented value="all" onChange={() => {}} options={[
            { value: 'all', label: `${t('newMsg.all')} · ${pilgrims.length}` },
            { value: 'group', label: t('newMsg.group'), disabled: true, title: t('common.soon') },
            { value: 'notArrived', label: t('newMsg.notArrived'), disabled: true, title: t('newMsg.notArrivedHint') },
          ]} />
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t('newMsg.text')}</h2>
          <textarea value={text} onChange={(e) => setText(e.target.value)} dir="rtl" lang="ar" rows={3}
            placeholder={t('newMsg.textPh')}
            className="w-full resize-none rounded-2xl border border-line-strong/70 bg-white px-4 py-3 text-xl leading-relaxed outline-none focus:border-navy-800" />
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t('newMsg.priority')}</h2>
          <Segmented value={priority} onChange={setPriority} options={[
            { value: 'normal', label: t('priority.normal') },
            { value: 'important', label: t('priority.important') },
            { value: 'urgent', label: t('priority.urgent') },
          ]} />
        </section>

        {/* Auto-translation preview (mint box) */}
        <section className="rounded-[var(--radius-card)] bg-mint p-4">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-bold text-mint-ink">
            <Icon name="languages" className="size-5" />
            <span>{t('newMsg.autoTranslate')}</span>
            {targets.map((l) => (
              <span key={l}>· {langLabel(l)}{langCounts[l] ? ` (${langCounts[l]})` : ''}</span>
            ))}
          </div>

          {status === 'failed' && (
            <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-danger-ink">{t('newMsg.failed')}</p>
          )}

          {translations && (
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-sm text-mint-ink/80">{t('newMsg.editHint')}</p>
              {targets.map((l) => (
                <label key={l} className="block">
                  <span className="mb-1 block text-sm font-bold text-muted">{langLabel(l)}</span>
                  <textarea value={translations[l] ?? ''} rows={l === 'ur' ? 3 : 2}
                    onChange={(e) => setTranslations((tr) => ({ ...tr, [l]: e.target.value }))}
                    dir={isRtl(l) ? 'rtl' : 'ltr'} lang={l} placeholder={t('newMsg.emptyFallback')}
                    className={`w-full resize-none rounded-xl border border-mint-ink/20 bg-white/70 px-3 py-2 text-lg leading-relaxed outline-none focus:border-mint-ink
                      ${l === 'ur' ? 'font-urdu' : ''}`} />
                </label>
              ))}
            </div>
          )}

          {translations && (stale || status === 'failed' || status === 'translating') && (
            <div className="mt-3 flex items-center gap-3">
              {stale && status !== 'translating' && <span className="text-sm text-gold-ink">{t('newMsg.stale')}</span>}
              <button type="button" onClick={runTranslate} disabled={!trimmed || busy}
                className="ms-auto flex items-center gap-2 rounded-xl border-2 border-mint-ink/40 bg-white px-4 py-2 font-bold text-mint-ink disabled:opacity-50">
                <Icon name="languages" className={`size-5 ${status === 'translating' ? 'animate-pulse' : ''}`} />
                {status === 'translating' ? t('newMsg.translating') : t('newMsg.retranslate')}
              </button>
            </div>
          )}
        </section>

        {/* Lock-screen notification preview (privacy) */}
        <div className="flex items-center gap-3 rounded-2xl bg-navy-900 px-4 py-3.5 text-white">
          <span className="grid size-10 place-items-center rounded-lg bg-white/10 text-gold"><Icon name="megaphone" className="size-5" /></span>
          <div>
            <div className="font-bold">{t('newMsg.lockTitle')}</div>
            <div className="text-sm text-white/70">{t('newMsg.lockBody')}</div>
          </div>
        </div>

        {sendError && (
          <div className="rounded-xl bg-danger-soft px-4 py-3 font-semibold text-danger-ink">
            <p>{t(sendError)}</p>
            {sendError === 'newMsg.leaderSessionEnded' && (
              <button onClick={signOut} className="mt-2 rounded-lg bg-danger px-4 py-2 font-bold text-white">
                {t('newMsg.signInAgain')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom action */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[430px] bg-page/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        {needsPreview ? (
          <button onClick={runTranslate} disabled={!trimmed || busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-navy-800 py-4 text-xl font-bold text-white disabled:opacity-50">
            <Icon name="languages" className="size-6" />
            {status === 'translating' ? t('newMsg.translating') : t('newMsg.translate')}
          </button>
        ) : (
          <button onClick={send} disabled={!trimmed || busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-navy-800 py-4 text-xl font-bold text-white disabled:opacity-50">
            <Icon name="send" className="size-6 rtl:-scale-x-100" />
            {status === 'sending' ? t('newMsg.sending') : t('newMsg.send')}
          </button>
        )}
      </div>
    </Screen>
  )
}

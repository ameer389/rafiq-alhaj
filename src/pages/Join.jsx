import { useEffect, useRef, useState } from 'react'
import { Screen, TopBar } from '../components/Layout'
import { Button, IconCircle, InfoCard, InfoRow, Notice, Chip } from '../components/ui'
import { LANGS, useI18n } from '../i18n'
import { useSession } from '../lib/session'
import { supabase } from '../lib/supabase'
import { save } from '../lib/storage'
import { isForMember } from '../lib/arrival'
import { fmtTime } from '../lib/format'

// Onboarding — screens 01–08 (ADAPT: campaign code instead of scanning a Nusuk card).
// 01 language → 02 code (+ name) → 03 wrong code → 04 confirm group (preview_campaign) → 05 not my group
// → 06 preparing (join + save on device) → 07 ready | 08 partially ready (offline mid-way).
const ORDER = ['ar', 'en', 'ur', 'id'] // screen 01 order, + Indonesian

export default function Join() {
  const { t, lang, setLang } = useI18n()
  const { preview, join, finishJoin, cancelOnboarding } = useSession()
  const [step, setStep] = useState('lang') // lang | code | confirm | notMine | preparing | ready | partial
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(null) // { title, hint } i18n keys
  const [busy, setBusy] = useState(false)
  const [group, setGroup] = useState(null) // preview_campaign result
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null) // { member, campaign, saved: [], pending: [] }
  const codeRef = useRef(null)

  useEffect(() => { if (step === 'code') codeRef.current?.focus() }, [step])

  // 02 → 04
  async function checkCode(e) {
    e?.preventDefault()
    if (!name.trim()) return setError({ title: 'join.errName' })
    if (!code.trim()) return codeRef.current?.focus()
    setBusy(true); setError(null)
    try {
      const g = await preview(code)
      if (!g) { setError({ title: 'onboard.failTitle', hint: 'onboard.failHint' }); return }
      setGroup(g); setStep('confirm')
    } catch (err) {
      console.warn(err)
      setError({ title: 'onboard.netFailTitle', hint: 'onboard.netFailHint' })
    } finally { setBusy(false) }
  }

  // 03 "حاول مرة أخرى": clear and focus the code field
  function retry() { setError(null); setCode(''); codeRef.current?.focus() }

  // 04 → 06 → 07/08
  async function confirmJoin() {
    setStep('preparing'); setProgress(0.15)
    const started = Date.now()
    const res = await join({ code, name, lang }, { defer: true })
    if (res.error) {
      setStep('code')
      setError(res.error === 'join.errInvalid'
        ? { title: 'onboard.failTitle', hint: 'onboard.failHint' }
        : { title: 'onboard.netFailTitle', hint: 'onboard.netFailHint' })
      return
    }
    const { member, campaign } = res
    // Saved on the device: campaign + member (assembly point, leader name & phone).
    save('rafiq.member', member); save('rafiq.campaign', campaign)
    const saved = ['campaign']; const pending = []
    setProgress(0.55)
    // Leader messages + my confirmations, so they open offline.
    try {
      const [m, a] = await Promise.all([
        supabase.from('messages').select('*').eq('campaign_id', campaign.id).order('created_at', { ascending: false }),
        supabase.from('acknowledgements').select('message_id').eq('member_id', member.id),
      ])
      if (m.error || a.error) throw m.error || a.error
      save('rafiq.messages', m.data.filter((x) => isForMember(x, member.id)).slice(0, 30))
      save('rafiq.acked', a.data.map((x) => x.message_id))
      saved.push('messages')
    } catch (err) {
      console.warn('messages not saved yet', err)
      pending.push('messages')
    }
    setProgress(1)
    await new Promise((r) => setTimeout(r, Math.max(0, 900 - (Date.now() - started)))) // let the bar finish
    setResult({ member, campaign, saved, pending })
    setStep(pending.length ? 'partial' : 'ready')
  }

  const finish = () => finishJoin(result.member, result.campaign)
  const backToCode = () => { cancelOnboarding(); setGroup(null); setStep('code') }

  // ---------- 01 language ----------
  if (step === 'lang') {
    return (
      <Screen className="px-5 pt-20">
        <h1 className="mb-8 text-center text-[1.75rem] font-bold">{t('join.chooseLang')}</h1>
        <div className="flex flex-col gap-3">
          {ORDER.map((code) => {
            const l = LANGS.find((x) => x.code === code)
            return (
              <button key={code} type="button" onClick={() => { setLang(code); setStep('code') }}
                dir={code === 'ar' || code === 'ur' ? 'rtl' : 'ltr'} lang={code}
                className={`min-h-[5.25rem] rounded-[var(--radius-card)] border border-line bg-surface px-5 text-[1.6rem] font-bold transition active:bg-neutral-soft
                  ${code === 'ur' ? 'font-urdu leading-[2.4]' : ''}`}>
                {l.label}
              </button>
            )
          })}
        </div>
      </Screen>
    )
  }

  // ---------- 02 / 03 code ----------
  if (step === 'code') {
    return (
      <Screen>
        <TopBar onBack={() => { setError(null); setStep('lang') }} title={t('onboard.codeTitle')} subtitle={t('onboard.codeHint')} />
        <form onSubmit={checkCode} className="flex flex-col gap-4 px-5 pt-4">
          {/* Same dark panel as the card scanner (02), with a code field instead of the camera */}
          <div className="rounded-[1.75rem] bg-ink px-5 pb-6 pt-5 text-white">
            <label htmlFor="code" className="mb-3 block text-center text-white/75">{t('onboard.codeLabel')}</label>
            <input id="code" ref={codeRef} value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null) }}
              placeholder="NOOR24" dir="ltr" autoCapitalize="characters" autoComplete="off" spellCheck={false}
              className="mx-auto block w-full rounded-[1.25rem] border-[3px] border-white bg-white/10 px-4 py-6 text-center text-[2rem] font-bold tracking-[0.2em] text-white outline-none placeholder:text-white/30 focus:bg-white/15" />
            <p className="mt-3 text-center text-sm text-white/60">{t('join.leaderHint')}</p>
          </div>

          <label className="block">
            <span className="mb-2 block text-lg font-bold">{t('join.name')}</span>
            <input value={name} onChange={(e) => { setName(e.target.value); setError(null) }} placeholder={t('join.namePh')} autoComplete="name"
              className="w-full rounded-[var(--radius-btn)] border border-line-strong bg-surface px-4 py-4 text-lg outline-none focus:border-primary" />
          </label>

          {error && (
            <Notice tone="sand">
              <div className="font-bold">{t(error.title)}</div>
              {error.hint && <div className="mt-1 font-normal">{t(error.hint)}</div>}
            </Notice>
          )}

          {error?.hint
            ? <Button onClick={error.title === 'onboard.failTitle' ? retry : checkCode}>{t('onboard.tryAgain')}</Button>
            : <Button type="submit" disabled={busy}>{busy ? t('onboard.checking') : t('onboard.continue')}</Button>}
        </form>
      </Screen>
    )
  }

  // ---------- 04 confirm group ----------
  if (step === 'confirm') {
    return (
      <Screen>
        <TopBar onBack={backToCode} title={t('onboard.confirmTitle')} />
        <div className="flex flex-col gap-4 px-5 pt-4">
          <InfoCard>
            <InfoRow label={t('onboard.campaign')}>{group.name}</InfoRow>
            <InfoRow label={t('onboard.leader')}>{group.leader_name}</InfoRow>
            <InfoRow label={t('onboard.assembly')}>
              {group.assembly_point}{group.assembly_time ? ` · ${fmtTime(group.assembly_time, lang, t, { long: true })}` : ''}
            </InfoRow>
          </InfoCard>
          {group.role === 'leader' && <div><Chip tone="primary" icon="userCheck">{t('onboard.asLeader')}</Chip></div>}
          <Button onClick={confirmJoin}>{t('onboard.yesMine')}</Button>
          <Button variant="secondary" onClick={() => { cancelOnboarding(); setStep('notMine') }}>{t('onboard.notMine')}</Button>
        </div>
      </Screen>
    )
  }

  // ---------- 05 not my group ----------
  if (step === 'notMine') {
    return (
      <Screen>
        <TopBar onBack={() => setStep('code')} title={t('onboard.notAddedTitle')} subtitle={t('onboard.notAddedBody')} />
        <div className="flex flex-col gap-4 px-5 pt-4">
          <Notice tone="neutral" icon="mapPin"><span className="text-ink">{t('onboard.notAddedPlace')}</span></Notice>
          <Button onClick={() => { setCode(''); setGroup(null); setStep('code') }}>{t('onboard.enterAgain')}</Button>
        </div>
      </Screen>
    )
  }

  // ---------- 06 preparing ----------
  if (step === 'preparing') {
    return (
      <Screen className="flex flex-col items-center px-5 pt-28 text-center">
        <IconCircle icon="refresh" size="size-20" iconSize="size-9 animate-spin" />
        <h1 className="mt-6 text-[1.75rem] font-bold leading-snug">{t('onboard.preparing')}</h1>
        <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-neutral-track" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
      </Screen>
    )
  }

  // ---------- 07 ready / 08 partially ready ----------
  const partial = step === 'partial'
  const list = (keys) => keys.map((k) => t(`onboard.item_${k}`)).join('، ')
  return (
    <Screen className="flex flex-col items-center px-5 pt-28 text-center">
      <IconCircle icon={partial ? 'clock' : 'check'} tone={partial ? 'sand' : 'primary'} size="size-20" iconSize="size-9" />
      <h1 className="mt-6 text-[1.75rem] font-bold">{t(partial ? 'onboard.partialTitle' : 'onboard.readyTitle')}</h1>
      {partial ? (
        <p className="mt-3 text-lg leading-relaxed">
          {t('onboard.partialSaved', { items: list(result.saved) })} {t('onboard.partialPending', { items: list(result.pending) })}
        </p>
      ) : (
        <p className="mt-3 text-lg leading-relaxed text-muted">{t('onboard.readyBody')}</p>
      )}
      <Button className="mt-6 w-full" onClick={finish}>{t(partial ? 'onboard.continue' : 'onboard.start')}</Button>
    </Screen>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Screen, TopBar } from '../../components/Layout'
import { BottomSheet, Button, IconCircle, Notice } from '../../components/ui'
import { useCallLeader } from '../../components/CallLeader'
import { useI18n } from '../../i18n'
import { useSession } from '../../lib/session'
import { getLocationOnce, useHelpRequests } from '../../lib/helpRequests'
import { useOnline } from '../../lib/useOnline'
import { geoPermission } from '../../lib/geo'
import { fmtTime } from '../../lib/format'

// Screen 14 — «أنا ضائع»: calm him down, remind him of the assembly point, then two choices.
// «أرسلوا لي أحدًا» → consent sheet (20 / 21 offline) → help request (status page 22–27).
// «أرني الطريق» → screen 15 (location stays on the phone) → route 16/17, or the organizer card 18.
export default function Lost() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const { campaign } = useSession()
  const { active, submit } = useHelpRequests()
  const online = useOnline()
  const [params] = useSearchParams()
  const [wayConsent, setWayConsent] = useState(false)
  const callLeader = useCallLeader()
  const [consent, setConsent] = useState(false)
  const [locating, setLocating] = useState(false)

  // Screen 15 is asked once; if the browser already decided, go straight on.
  async function showWay() {
    const p = await geoPermission()
    if (p === 'granted') navigate('/p/route')
    else if (p === 'denied') navigate('/p/route?denied=1')
    else setWayConsent(true)
  }
  // «ما زلت ضائعاً؟ أرسلوا لي أحداً» from the route screen lands here with ?send=1
  useEffect(() => { if (params.has('send')) sendSomeone() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function sendSomeone() {
    if (active) return navigate(`/p/help/${active.client_id}`) // one request at a time
    setConsent(true)
  }
  async function send(withLocation) {
    let loc = null
    if (withLocation) { setLocating(true); loc = await getLocationOnce(); setLocating(false) }
    const item = submit({ type: 'lost', ...(loc ?? {}) })
    navigate(`/p/help/${item.client_id}`, { replace: true })
  }

  return (
    <Screen>
      <TopBar back="/p" title={t('req.lostTitle')} />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <p className="text-lg text-muted">
          {t('req.assemblyLabel')} <b className="text-ink">{campaign?.assembly_point}</b>
          {campaign?.assembly_time && ` · ${fmtTime(campaign.assembly_time, lang, t, { long: true })}`}
        </p>

        <button type="button" onClick={showWay}
          className="flex min-h-[6.5rem] items-center gap-4 rounded-[var(--radius-hero)] bg-primary px-5 text-start text-white">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-white/15"><Icon name="compass" className="size-8" /></span>
          <span className="text-[1.6rem] font-bold">{t('req.showWay')}</span>
        </button>

        <button type="button" onClick={sendSomeone}
          className="flex min-h-[6.5rem] items-center gap-4 rounded-[var(--radius-hero)] border border-line bg-surface px-5 text-start">
          <IconCircle icon="userPlus" tone="danger" size="size-16" iconSize="size-8" />
          <span className="text-[1.6rem] font-bold">{t('req.sendSomeone')}</span>
        </button>

        <Button variant="secondary" icon="phone" onClick={callLeader.call}>{t('home.callLeader')}</Button>
      </div>

      {/* Screens 20 / 21 — separate, explicit consent for the location; sending without it is just as easy */}
      <BottomSheet open={consent} onClose={() => !locating && setConsent(false)} title={t('req.consentTitle')}>
        <p className="text-lg text-muted">{t('req.consentBody')}</p>
        {!online && <Notice tone="neutral" className="mt-4 font-normal text-ink">{t('req.consentOffline')}</Notice>}
        <div className="mt-5 flex flex-col gap-3">
          <Button onClick={() => send(true)} disabled={locating}>{locating ? t('req.locating') : t('req.consentYes')}</Button>
          <Button variant="secondary" onClick={() => send(false)} disabled={locating}>{t('req.consentNo')}</Button>
        </div>
      </BottomSheet>
      {/* Screen 15 — first location consent: only to show the way, never sent */}
      <BottomSheet open={wayConsent} onClose={() => setWayConsent(false)} title={t('way.permTitle')}>
        <p className="text-lg text-muted">{t('way.permBody')}</p>
        <div className="mt-5 flex flex-col gap-3">
          <Button onClick={() => navigate('/p/route')}>{t('way.yes')}</Button>
          <Button variant="secondary" onClick={() => navigate('/p/route?declined=1')}>{t('way.noThanks')}</Button>
        </div>
      </BottomSheet>
      {callLeader.sheet}
    </Screen>
  )
}

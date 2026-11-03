import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Screen, TopBar } from '../../components/Layout'
import { Button, IconCircle, Notice, StepBar } from '../../components/ui'
import { useCallLeader } from '../../components/CallLeader'
import { LatestMessageCard } from '../../components/MessageCards'
import { useI18n } from '../../i18n'
import { requestCode, requestStep, useHelpRequests } from '../../lib/helpRequests'
import { usePilgrimMessages } from '../../lib/pilgrimMessages'
import { useOnline } from '../../lib/useOnline'
import { fmtNum } from '../../lib/format'

// /p/help → my active request, or start from «أنا ضائع».
export function HelpIndex() {
  const { active } = useHelpRequests()
  return <Navigate to={active ? `/p/help/${active.client_id}` : '/p/lost'} replace />
}

// Screens 22–27 — one help request, step by step. Honest: each step only claims what really happened.
//  1 saved on phone (22) / send failed (23) · 2 arrived (24) · 3 supervisor took it (25)
//  4 help on the way (26) · 5 arrived safe / closed (27)
export default function HelpStatus() {
  const { cid } = useParams()
  const { t, lang } = useI18n()
  const online = useOnline()
  const { requests, retry, resolveMine, sharing, startSharing, stopSharing } = useHelpRequests()
  const { messages } = usePilgrimMessages()
  const callLeader = useCallLeader()
  const [noLoc, setNoLoc] = useState(false)
  const [locBusy, setLocBusy] = useState(false)

  const r = requests.find((x) => x.client_id === cid)
  if (!r) return <Navigate to="/p/lost" replace />

  const step = requestStep(r)
  const failed = step === 1 && r.failed && online
  const byLeader = step === 5 && r.server?.resolved_by === 'leader' && !r.resolvedLocally
  const [title, body] = step === 1
    ? (failed ? ['req.failTitle', 'req.failBody'] : ['req.s1Title', 'req.s1Body'])
    : step === 5 ? (byLeader ? ['req.closedTitle', 'req.closedBody'] : ['req.s5Title', 'req.s5Body'])
    : [`req.s${step}Title`, `req.s${step}Body`]
  // 26: the leader's latest message sent after the request
  const leaderMsg = step === 4 ? messages.find((m) => m.created_at > r.created_at) : null

  async function shareNow() {
    setLocBusy(true); setNoLoc(false)
    const ok = await startSharing()
    setLocBusy(false); if (!ok) setNoLoc(true)
  }

  return (
    <Screen>
      <TopBar back="/p" />
      <div className="flex flex-col items-center px-5 pt-6 text-center">
        <IconCircle icon={step === 1 ? 'clock' : 'check'} tone={step === 1 ? 'sand' : 'primary'} size="size-20" iconSize="size-10" />
        <h1 className="mt-5 text-[1.75rem] font-bold leading-snug">{t(title)}</h1>
        <p className="mt-2 text-lg text-muted">{t(body)}</p>
        {byLeader && r.server?.resolution_note && <p className="mt-1 text-lg">«{r.server.resolution_note}»</p>}
        <div className="mt-6 w-full"><StepBar step={step} tone={step === 1 ? 'sand' : 'primary'} /></div>
        <p className="mt-3 text-muted">
          {t('req.step', { n: fmtNum(step, lang), total: fmtNum(5, lang) })} · {t('req.reqNo')} <b dir="ltr">{requestCode(r)}</b>
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-4 px-5">
        {step === 1 && !failed && <Notice tone="sand">{t('req.s1Notice')}</Notice>}
        {leaderMsg && <LatestMessageCard m={leaderMsg} />}

        {step === 5 ? (
          <Button to="/p">{t('req.backHome')}</Button>
        ) : (
          <>
            {failed && <Button onClick={() => retry(r.client_id)}>{t('req.retryNow')}</Button>}
            <Button icon="check" onClick={() => resolveMine(r)}>{t('req.arrivedSafe')}</Button>
            <Button variant="secondary" icon="phone" onClick={callLeader.call}>{t('home.callLeader')}</Button>

            {/* location row (22–26): explicit, stoppable, stops by itself on «وصلت بأمان» */}
            <div className="flex min-h-16 items-center gap-3 rounded-[var(--radius-card)] border border-line bg-neutral-soft px-4 py-3">
              <Icon name="mapPin" className="size-6 shrink-0 text-ink" />
              <span className="flex-1 text-lg">
                {sharing ? t('req.locSending') : r.state !== 'sent' && r.location_shared ? t('req.locSaved') : t('req.locNotSent')}
              </span>
              {sharing
                ? <button onClick={stopSharing} className="px-2 py-2 text-lg font-bold text-primary">{t('req.stop')}</button>
                : !(r.state !== 'sent' && r.location_shared) && (
                  <button onClick={shareNow} disabled={locBusy} className="px-2 py-2 text-lg font-bold text-primary disabled:opacity-50">
                    {locBusy ? t('req.locating') : t('req.sendLoc')}
                  </button>
                )}
            </div>
            {noLoc && <p className="text-center text-sand-ink">{t('req.noLocation')}</p>}
          </>
        )}
      </div>
      {callLeader.sheet}
    </Screen>
  )
}

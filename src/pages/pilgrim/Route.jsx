import { Suspense, lazy, useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Screen, TopBar } from '../../components/Layout'
import { Button, IconCircle, Notice } from '../../components/ui'
import { useI18n } from '../../i18n'
import { useSession } from '../../lib/session'
import { usePilgrimMessages } from '../../lib/pilgrimMessages'
import { useHelpRequests } from '../../lib/helpRequests'
import { isArrival } from '../../lib/arrival'
import { useOnline } from '../../lib/useOnline'
import { ACCURATE_ENOUGH_M, bearingDeg, cardinal, distanceM, roundDistance, useHeading, useWatchPosition, walkMinutes } from '../../lib/geo'
import { fmtNum, fmtPhone } from '../../lib/format'

const RouteMap = lazy(() => import('../../components/RouteMap')) // Leaflet only when actually needed

function Steps({ items }) {
  const { lang } = useI18n()
  return (
    <ol className="flex flex-col gap-3">
      {items.map((s, i) => (
        <li key={i} className="flex items-center gap-3 text-lg">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary">{fmtNum(i + 1, lang)}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  )
}

// Feature 8 — screens 16 (route), 17 (location not accurate), 18 (no location: card for an organizer),
// 19 (arrived). Works OFFLINE: GPS + distance + arrow need no internet; the map shows only if tiles load.
// The location never leaves the phone here (that is a separate consent, in the help request).
export default function Route() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const online = useOnline()
  const { campaign: c } = useSession()
  const { messages, acked, ack } = usePilgrimMessages()
  const { active, resolveMine } = useHelpRequests()
  const noLocation = params.has('declined') || params.has('denied')
  const { status, pos } = useWatchPosition(!noLocation)
  const heading = useHeading()
  const [mapState, setMapState] = useState('loading') // loading | ok | failed
  const onMap = useCallback((s) => setMapState(s), [])
  const [done, setDone] = useState(null) // told | later | nothing

  const point = c?.assembly_point ?? ''
  const target = c?.assembly_lat != null ? { lat: c.assembly_lat, lng: c.assembly_lng } : null
  const accurate = status === 'ok' && pos && pos.acc <= ACCURATE_ENOUGH_M
  const mode = noLocation || status === 'denied' || !target ? 'card' : accurate ? 'route' : status === 'asking' ? 'asking' : 'inaccurate'
  const dist = accurate ? distanceM(pos, target) : null
  const bearing = accurate ? bearingDeg(pos, target) : null
  const fmtDist = (m) => {
    const r = roundDistance(m)
    if (r < 1000) return t('way.meters', { n: fmtNum(r, lang) })
    const km = (r / 1000).toFixed(1)
    return t('way.km', { n: fmtNum(lang === 'ar' || lang === 'ur' ? km.replace('.', '٫') : km, lang) })
  }
  const genericSteps = [
    t('way.step3', { point }),
    c?.camp ? t('way.stepCamp', { point, camp: c.camp }) : null,
    t('way.stepAsk', { point }),
  ].filter(Boolean)

  // Screen 19: tell the leader only through channels that really exist.
  async function arrived() {
    let told = false, later = false
    const check = messages.find((m) => isArrival(m) && !acked.has(m.id))
    if (check) { try { await ack(check.id); told = true } catch { /* offline */ } }
    if (active) {
      const wasSent = active.state === 'sent'
      await resolveMine(active)
      if (wasSent) { if (navigator.onLine) told = true; else later = true }
    }
    setDone(told ? 'told' : later ? 'later' : 'nothing')
  }

  if (done) {
    return (
      <Screen className="flex flex-col items-center px-5 pt-24 text-center">
        <IconCircle icon="check" size="size-20" iconSize="size-10" />
        <h1 className="mt-6 text-[1.75rem] font-bold">{t('way.doneTitle')}</h1>
        <p className="mt-3 text-lg text-muted">{t(done === 'told' ? 'way.doneTold' : done === 'later' ? 'way.doneLater' : 'way.doneNothing')}</p>
        <Button className="mt-6 w-full" to="/p">{t('req.backHome')}</Button>
      </Screen>
    )
  }

  const showMap = online && target && (mode === 'route' || mode === 'inaccurate') && mapState !== 'failed'

  return (
    <Screen>
      <TopBar back="/p/lost" title={t('way.title', { point })} subtitle={mode === 'card' ? t('way.cardIntro') : undefined} />
      <div className="flex flex-col gap-4 px-5 pt-4">
        {showMap && (
          <div className="relative">
            {mapState === 'loading' && <p className="absolute inset-0 grid place-items-center text-muted">{t('way.mapLoading')}</p>}
            <Suspense fallback={null}>
              <RouteMap me={accurate ? pos : null} target={target} onStatus={onMap}
                labels={{ me: t('way.youAreHere'), target: point }} />
            </Suspense>
            {mapState === 'ok' && accurate && <p className="mt-1 text-sm text-muted">{t('way.mapNote')}</p>}
          </div>
        )}

        {mode === 'asking' && (
          <div className="flex items-center gap-3 text-lg text-muted">
            <Icon name="refresh" className="size-6 animate-spin" />{t('way.locating')}
          </div>
        )}

        {mode === 'route' && (
          <>
            <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4">
              <span className="grid size-20 shrink-0 place-items-center rounded-full bg-primary text-white">
                {/* physical direction: clockwise from the top of the phone (not mirrored in RTL) */}
                <span className="block transition-transform duration-300" data-testid="arrow"
                  style={{ transform: `rotate(${Math.round(heading != null ? bearing - heading : bearing)}deg)` }}>
                  <Icon name="navigation" className="size-10 fill-current" />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[1.6rem] font-bold leading-tight">{t('way.about', { d: fmtDist(dist) })}</div>
                <div className="text-lg text-muted">{t('way.minutes', { n: fmtNum(walkMinutes(roundDistance(dist)), lang) })}</div>
                <div className="mt-1 text-sm text-muted">{heading != null ? t('way.arrowHint') : t('way.arrowNorth')}</div>
              </div>
            </div>
            <Steps items={[
              t('way.step1', { dir: t(`way.dir_${cardinal(bearing)}`) }),
              t('way.step2', { d: fmtDist(dist) }),
              t('way.step3', { point }),
            ]} />
          </>
        )}

        {mode === 'inaccurate' && (
          <>
            <Notice tone="sand">{t('way.inaccurate')}</Notice>
            <Steps items={genericSteps} />
          </>
        )}

        {mode === 'card' && (
          <>
            <section className="rounded-[var(--radius-card)] border-2 border-primary bg-surface p-5">
              <p className="text-lg">{t('way.cardLine', { campaign: c?.name ?? '' })}</p>
              <p className="mt-1 text-[2rem] font-bold leading-tight text-primary">{point}</p>
              {c?.camp && <p className="mt-1 text-lg">{c.camp}</p>}
              <p className="mt-2">
                {t('way.cardLeader', { name: c?.leader_name ?? '' })}
                {c?.leader_phone && <> · <b dir="ltr">{fmtPhone(c.leader_phone)}</b></>}
              </p>
            </section>
            {status === 'denied' && <Notice tone="neutral" icon="info" className="font-normal">{t('way.deniedHint')}</Notice>}
            <Steps items={genericSteps} />
          </>
        )}

        <Button icon="check" onClick={arrived}>{t('way.arrived')}</Button>
        <Button variant="secondary" onClick={() => navigate('/p/lost?send=1')}>{t('way.stillLost')}</Button>
        {mode === 'card' && noLocation && (
          <button onClick={() => setParams({}, { replace: true })} className="py-2 text-lg font-bold text-primary underline underline-offset-4">
            {t('way.useLocation')}
          </button>
        )}
      </div>
    </Screen>
  )
}

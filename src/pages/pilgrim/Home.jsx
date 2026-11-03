import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import AssemblyCard from '../../components/AssemblyCard'
import { AppHeader, Screen } from '../../components/Layout'
import { Button, IconCircle } from '../../components/ui'
import { LatestMessageCard } from '../../components/MessageCards'
import { useI18n } from '../../i18n'
import { useSession } from '../../lib/session'
import { usePilgrimMessages } from '../../lib/pilgrimMessages'
import { requestStep, useHelpRequests } from '../../lib/helpRequests'
import { useCallLeader } from '../../components/CallLeader'
import { useSoon } from '../../lib/toast'
import { fmtTime } from '../../lib/format'

// Screen 11 — status of my open help request, on top of home. Honest: "arrived" ≠ "seen".
const REQ_STYLE = {
  queued: ['border-sand-line bg-sand-soft text-sand-ink', 'req_queued'],
  open: ['border-line bg-neutral-soft text-ink', 'req_open'],
  acknowledged: ['border-primary-line bg-primary-soft text-primary-ink', 'req_ack'],
  in_progress: ['border-primary-line bg-primary-soft text-primary-ink', 'req_way'],
}
function OpenRequestCard() {
  const { t } = useI18n()
  const { active: r } = useHelpRequests()
  if (!r) return null
  const key = ['', 'queued', 'open', 'acknowledged', 'in_progress'][requestStep(r)]
  const [cls, k] = REQ_STYLE[key] ?? REQ_STYLE.open
  return (
    <section className={`rounded-[var(--radius-card)] border px-5 py-4 ${cls}`}>
      <h2 className="text-xl font-bold">{t(`home.${k}_title`)}</h2>
      <p className="mt-1.5 text-lg leading-relaxed">{t(`home.${k}_body`)}</p>
      <Link to={`/p/help/${r.client_id}`} className="mt-2 inline-block text-lg font-bold underline underline-offset-4">{t('home.viewRequest')}</Link>
    </section>
  )
}

// Screen 12 — the leader changed the assembly time/point (live via Realtime on campaigns).
function AssemblyChangedAlert() {
  const { t, lang } = useI18n()
  const { assemblyAlert: a, dismissAssemblyAlert } = useSession()
  if (!a) return null
  const timeChanged = a.oldTime !== a.newTime
  const pointChanged = a.oldPoint !== a.newPoint
  const tm = (iso) => fmtTime(iso, lang, t, { long: true })
  return (
    <section role="alert" className="flex items-center gap-3 rounded-[var(--radius-card)] border border-sand-line bg-sand-soft px-5 py-4 text-sand-ink">
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-bold">{t(timeChanged ? 'home.timeChanged' : 'home.placeChanged')}</h2>
        {timeChanged && <p className="mt-1 text-lg">{t('home.changedLine', { new: tm(a.newTime), old: tm(a.oldTime) })}</p>}
        {pointChanged && <p className="mt-1 text-lg">{t('home.changedLine', { new: a.newPoint, old: a.oldPoint })}</p>}
      </div>
      <button onClick={dismissAssemblyAlert} className="shrink-0 px-2 py-2 text-lg font-bold">{t('home.ok')}</button>
    </section>
  )
}

function Tile({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="flex min-h-36 flex-col items-center justify-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition active:bg-neutral-soft">
      <IconCircle icon={icon} size="size-16" iconSize="size-7" />
      <span className="text-xl font-bold leading-snug">{label}</span>
    </button>
  )
}

// Screens 09 (online) / 10 (offline — only the chip changes) / 11 / 12 / 13.
export default function PilgrimHome() {
  const { t } = useI18n()
  const { campaign } = useSession()
  const { messages, acked } = usePilgrimMessages()
  const soon = useSoon()
  const callLeader = useCallLeader()
  const latest = messages[0]
  const latestUnread = latest && !acked.has(latest.id)

  return (
    <Screen>
      <AppHeader title={campaign?.name} subtitle={t('app.name')} />

      <div className="flex flex-col gap-4 px-5 pt-3">
        <AssemblyChangedAlert />
        <OpenRequestCard />
        {/* a new (unconfirmed) leader message / arrival check goes to the top so it's seen */}
        {latest && latestUnread && <LatestMessageCard m={latest} />}

        <AssemblyCard campaign={campaign} />

        {/* Red = real danger only: «أنا ضائع» */}
        <Link to="/p/lost"
          className="flex flex-col items-center rounded-[var(--radius-hero)] bg-danger px-6 py-6 text-center text-white transition active:brightness-95">
          <span className="grid h-12 w-16 place-items-center rounded-full bg-white/20"><Icon name="alert" className="size-8" /></span>
          <span className="mt-2 text-[2.4rem] font-bold leading-tight">{t('home.lost')}</span>
          <span className="mt-1 text-lg text-white/90">{t('home.lostSub')}</span>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Tile icon="phone" label={t('home.callLeader')} onClick={callLeader.call} />
          <Tile icon="mic" label={t('home.askRafiq')} onClick={soon} />
        </div>

        {latest && !latestUnread && <LatestMessageCard m={latest} />}
        {messages.length > 1 && (
          <Link to="/p/messages" className="text-center text-lg font-bold text-primary underline underline-offset-4">
            {t('msg.all')}
          </Link>
        )}

        <Button variant="secondary" icon="users" to="/p/campaign" className="text-xl">{t('home.campaignSettings')}</Button>
      </div>

      {callLeader.sheet}
    </Screen>
  )
}

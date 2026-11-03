import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BottomNav, { LEADER_NAV } from '../../components/BottomNav'
import LeaderHeader from '../../components/LeaderHeader'
import { Screen } from '../../components/Layout'
import { Button, Chip } from '../../components/ui'
import { langLabel, useI18n } from '../../i18n'
import { isAuthError, useSession } from '../../lib/session'
import { memberStatuses, useLeaderData } from '../../lib/leaderData'
import { sendArrivalCheck } from '../../lib/arrival'
import { useSoon, useToast } from '../../lib/toast'
import { fmtDayTime, fmtNum } from '../../lib/format'

export const STATE_CHIP = {
  arrived: ['primary', 'mem.c_arrived'],
  notConfirmed: ['neutral', 'mem.c_notConfirmed'],
  needHelp: ['danger', 'mem.c_needHelp'],
}
const FILTERS = [
  ['all', 'mem.f_all'], ['arrived', 'mem.f_arrived'],
  ['notConfirmed', 'mem.f_notConfirmed'], ['needHelp', 'mem.f_needHelp'],
]

// Screens 44 (members, feature 9) / 45 (arrival tracking = the «لم يؤكدوا» filter, one tap).
export default function Members() {
  const { t, lang } = useI18n()
  const { member } = useSession()
  const soon = useSoon()
  const toast = useToast()
  const { pilgrims, messages, acks, helpRequests, addMessage } = useLeaderData()
  const [params, setParams] = useSearchParams()
  const filter = FILTERS.some(([f]) => f === params.get('f')) ? params.get('f') : 'all'
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)

  const { map, arrival } = memberStatuses(pilgrims, messages, acks, helpRequests)
  const count = (f) => (f === 'all' ? pilgrims.length : pilgrims.filter((p) => map[p.id]?.state === f).length)
  const list = pilgrims
    .filter((p) => filter === 'all' || map[p.id]?.state === filter)
    .filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))

  async function askArrival() {
    setBusy(true)
    const { message, error, status } = await sendArrivalCheck(member)
    setBusy(false)
    if (error) return toast(t(isAuthError(error, status) ? 'newMsg.leaderSessionEnded' : 'newMsg.sendFailed'))
    addMessage(message); toast(t('newMsg.sent'))
  }

  return (
    <Screen nav={<BottomNav items={LEADER_NAV} />}>
      <LeaderHeader />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[1.75rem] font-bold">{t('mem.title')}</h1>
          <Button size="md" icon="userPlus" iconClass="size-5" onClick={soon}>{t('mem.addPilgrim')}</Button>
        </div>

        <div className="grid grid-cols-2 gap-3" role="tablist">
          {FILTERS.map(([f, label]) => {
            const active = f === filter
            const n = f === 'all' || f === 'needHelp' || arrival ? fmtNum(count(f), lang) : '—'
            return (
              <button key={f} role="tab" aria-selected={active} onClick={() => setParams(f === 'all' ? {} : { f }, { replace: true })}
                className={`flex min-h-16 items-center justify-between gap-2 rounded-[var(--radius-card)] border px-3.5 text-[1.05rem] font-bold
                  ${active ? 'border-2 border-primary bg-primary-soft/60' : 'border-line bg-surface'}`}>
                <span className="whitespace-nowrap">{t(label)}</span><span className="text-xl">{n}</span>
              </button>
            )
          })}
        </div>
        <p className="text-muted">
          {t('mem.notConfirmedNote')} {arrival ? t('mem.arrivalSent', { time: fmtDayTime(arrival.created_at, lang, t) }) : t('mem.noArrivalYet')}
        </p>
        <Button variant="secondary" size="md" icon="checkCircle" iconClass="size-5" onClick={askArrival} disabled={busy}>
          {busy ? t('arrival.sending') : t('lm.arrivalCheck')}
        </Button>

        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('mem.search')} type="search"
          className="min-h-14 w-full rounded-[var(--radius-card)] border border-line-strong bg-surface px-5 text-lg outline-none focus:border-primary" />

        <ul className="divide-y divide-line-soft">
          {list.map((p) => {
            const st = map[p.id]?.state
            return (
              <li key={p.id}>
                <Link to={`/l/members/${p.id}`} className="flex items-center gap-3 py-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-neutral-soft text-xl font-bold">{p.name.trim()[0]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xl font-bold">{p.name}</div>
                    <div className="text-muted">{langLabel(p.lang)}</div>
                  </div>
                  {st && <Chip tone={STATE_CHIP[st][0]}>{t(STATE_CHIP[st][1])}</Chip>}
                </Link>
              </li>
            )
          })}
        </ul>
        {list.length === 0 && <p className="py-6 text-center text-muted">{t('mem.noMatch')}</p>}
      </div>
    </Screen>
  )
}

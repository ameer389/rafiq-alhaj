import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BottomNav, { LEADER_NAV } from '../../components/BottomNav'
import Icon from '../../components/Icon'
import { Screen, TopBar } from '../../components/Layout'
import { Button, Chip, IconCircle, InfoCard, InfoRow, Notice } from '../../components/ui'
import { useI18n } from '../../i18n'
import { useSession } from '../../lib/session'
import { useLeaderData } from '../../lib/leaderData'
import { supabase } from '../../lib/supabase'
import { useOnline } from '../../lib/useOnline'
import { fmtDayTime } from '../../lib/format'
import { mapsUrl } from './RequestDetail'

// /r?m=<member_id>&c=<client_id>&t=<type>&lat=&lng=&ts=<unix s> — the link inside a pilgrim's SMS
// (help request sent while the pilgrim had no data). Opened by the leader → `leader_log_help` logs it
// with the pilgrim's client_id (idempotent: a second call returns duplicate: true, never a 2nd row).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TYPES = ['lost', 'medical', 'other']

export function readSmsParams(search) {
  const q = new URLSearchParams(search)
  const num = (v) => (v != null && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null)
  const ts = num(q.get('ts'))
  const lat = num(q.get('lat')); const lng = num(q.get('lng'))
  const loc = lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  const m = q.get('m') ?? ''; const c = q.get('c') ?? ''
  return {
    m, c, type: TYPES.includes(q.get('t')) ? q.get('t') : 'other',
    lat: loc ? lat : null, lng: loc ? lng : null,
    createdAt: ts ? new Date(ts * 1000).toISOString() : null,
    valid: UUID.test(m) && c.length > 0 && c.length <= 100,
  }
}

// One RPC per link + attempt, shared across React StrictMode's double effect run — otherwise the
// second call would come back as duplicate: true and wrongly show "already logged".
const inflight = new Map()
function logOnce(p, attempt) {
  const key = `${p.m}|${p.c}|${attempt}`
  if (!inflight.has(key)) {
    inflight.set(key, supabase.rpc('leader_log_help', {
      p_member_id: p.m, p_client_id: p.c, p_type: p.type, p_lat: p.lat, p_lng: p.lng, p_created_at: p.createdAt,
    }))
  }
  return inflight.get(key)
}

function errorKey(error) {
  const msg = `${error?.message ?? ''} ${error?.details ?? ''}`
  if (/member_not_in_campaign/.test(msg)) return 'smsLog.errNotMine'
  if (/not_leader/.test(msg) || error?.code === 'PGRST301') return 'smsLog.errSession'
  if (error?.code === '22P02') return 'smsLog.errLink' // malformed id in the link
  return 'smsLog.errNet'
}

// Leader session: log automatically on open, then confirm.
export default function SmsLog() {
  const { t, lang } = useI18n()
  const { search } = useLocation()
  const navigate = useNavigate()
  const online = useOnline()
  const { refreshHelp } = useLeaderData()
  const p = useMemo(() => readSmsParams(search), [search])
  const [attempt, setAttempt] = useState(0)
  const [res, setRes] = useState({ phase: 'working' })

  useEffect(() => {
    if (!p.valid) { setRes({ phase: 'error', err: 'smsLog.errLink' }); return }
    if (!online) { setRes({ phase: 'offline' }); return } // logged automatically when the network returns
    let alive = true
    setRes({ phase: 'working' })
    logOnce(p, attempt).then(async ({ data, error }) => {
      if (error) { console.warn('leader_log_help', error); if (alive) setRes({ phase: 'error', err: errorKey(error) }); return }
      await refreshHelp() // so «افتح الطلب» opens it right away
      if (alive) setRes({ phase: 'done', ...data })
    })
    return () => { alive = false }
  }, [p, online, attempt, refreshHelp])

  const retry = () => setAttempt((a) => a + 1)

  return (
    <Screen nav={<BottomNav items={LEADER_NAV} />}>
      <TopBar back="/l" />
      <div className="flex flex-col gap-4 px-5 pt-4">
        {res.phase === 'working' && (
          <div className="flex flex-col items-center py-12 text-center">
            <IconCircle icon="refresh" size="size-20" iconSize="size-9 animate-spin" />
            <h1 className="mt-5 text-[1.6rem] font-bold">{t('smsLog.working')}</h1>
          </div>
        )}

        {res.phase === 'offline' && (
          <div className="flex flex-col items-center py-10 text-center">
            <IconCircle icon="wifiOff" tone="sand" size="size-20" iconSize="size-9" />
            <h1 className="mt-5 text-[1.5rem] font-bold leading-snug">{t('smsLog.offline')}</h1>
          </div>
        )}

        {res.phase === 'error' && (
          <>
            <div className="flex flex-col items-center pt-8 text-center">
              <IconCircle icon="info" tone="sand" size="size-20" iconSize="size-9" />
              <h1 className="mt-5 text-[1.6rem] font-bold leading-snug">{t(res.err)}</h1>
            </div>
            {res.err === 'smsLog.errNet' && <Button onClick={retry}>{t('smsLog.retry')}</Button>}
            <Button variant="secondary" to="/l">{t('smsLog.home')}</Button>
          </>
        )}

        {res.phase === 'done' && (
          <>
            <div className="flex flex-col items-center pt-4 text-center">
              <IconCircle icon={res.duplicate ? 'info' : 'checkCircle'} tone={res.duplicate ? 'neutral' : 'primary'} size="size-20" iconSize="size-10" />
              <h1 className="mt-5 text-[1.75rem] font-bold leading-snug">
                {res.duplicate ? t('smsLog.duplicate') : t('smsLog.logged', { name: res.member_name ?? '—' })}
              </h1>
              {res.duplicate && <p className="mt-2 text-lg text-muted">{t('smsLog.duplicateBody', { name: res.member_name ?? '—' })}</p>}
              <div className="mt-3"><Chip tone="neutral" icon="chat">{t('smsLog.viaSms')}</Chip></div>
            </div>

            <InfoCard>
              <InfoRow label={t('smsLog.type')}>{t(`help.kind_${p.type}`)}</InfoRow>
              {p.createdAt && <InfoRow label={t('smsLog.time')}>{fmtDayTime(p.createdAt, lang, t)}</InfoRow>}
              <InfoRow label={t('smsLog.location')} action={p.lat != null && (
                <a href={mapsUrl(p.lat, p.lng)} target="_blank" rel="noreferrer"
                  className="inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-btn)] border border-line px-4 font-bold text-primary">
                  <Icon name="mapPin" className="size-5" />{t('smsLog.openMap')}
                </a>
              )}>
                {p.lat != null
                  ? <span dir="ltr" className="text-base">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</span>
                  : <span className="font-normal text-muted">{t('smsLog.noLocation')}</span>}
              </InfoRow>
            </InfoCard>

            {res.id && <Button icon="inbox" onClick={() => navigate(`/l/r/${res.id}`, { replace: true })}>{t('smsLog.openRequest')}</Button>}
            <Button variant="secondary" to="/l">{t('smsLog.home')}</Button>
          </>
        )}
      </div>
    </Screen>
  )
}

// No session, or a pilgrim session: sign in as a leader first (leader code + name), then this same
// /r URL (params kept) continues automatically — App renders <SmsLog/> once the member is a leader.
// On iPhone the SMS link opens in Safari (not the installed app), so this is the usual path there.
export function SmsLeaderLogin() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const { member, preview, join, cancelOnboarding } = useSession()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!code.trim()) return setErr('smsLog.badCode')
    if (!name.trim()) return setErr('join.errName')
    if (!navigator.onLine) return setErr('smsLog.netFail')
    setBusy(true); setErr(null)
    try {
      const g = await preview(code)
      if (!g) { cancelOnboarding(); setErr('smsLog.badCode'); return }
      if (g.role !== 'leader') { cancelOnboarding(); setErr('smsLog.notLeaderCode'); return }
      const res = await join({ code, name, lang }) // becomes the leader session → <SmsLog/> takes over
      if (res.error) setErr(res.error === 'join.errInvalid' ? 'smsLog.badCode' : 'smsLog.netFail')
    } catch (e2) {
      console.warn(e2); cancelOnboarding(); setErr('smsLog.netFail')
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded-[var(--radius-btn)] border border-line-strong bg-surface px-4 py-4 text-lg outline-none focus:border-primary'
  return (
    <Screen>
      <TopBar title={t('smsLog.loginTitle')} subtitle={t('smsLog.loginHint')} />
      <form onSubmit={submit} className="flex flex-col gap-4 px-5 pt-4">
        {member && member.role !== 'leader' && <Notice tone="sand" icon="info">{t('smsLog.pilgrimDevice', { name: member.name })}</Notice>}
        <label className="block">
          <span className="mb-2 block text-lg font-bold">{t('smsLog.code')}</span>
          <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(null) }} placeholder="NOOR24-L"
            dir="ltr" autoCapitalize="characters" autoComplete="off" spellCheck={false}
            className={`${input} text-center text-2xl font-bold tracking-[0.15em]`} />
        </label>
        <label className="block">
          <span className="mb-2 block text-lg font-bold">{t('join.name')}</span>
          <input value={name} onChange={(e) => { setName(e.target.value); setErr(null) }} placeholder={t('join.namePh')} autoComplete="name" className={input} />
        </label>
        {err && <Notice tone="sand">{t(err)}</Notice>}
        <Button type="submit" icon="userCheck" disabled={busy}>{busy ? t('smsLog.checking') : t('smsLog.signIn')}</Button>
        <Button variant="secondary" onClick={() => navigate('/', { replace: true })}>{t('smsLog.cancel')}</Button>
      </form>
    </Screen>
  )
}

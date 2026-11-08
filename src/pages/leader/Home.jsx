import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import { supabase } from '../../lib/supabase'
import BottomNav, { LEADER_NAV } from '../../components/BottomNav'
import LeaderHeader from '../../components/LeaderHeader'
import { Screen } from '../../components/Layout'
import { Button, Chip } from '../../components/ui'
import TextSizeControl from '../../components/TextSizeControl'
import { useI18n } from '../../i18n'
import { isAuthError, useSession } from '../../lib/session'
import { arrivalStats, useLeaderData } from '../../lib/leaderData'
import { requestCode } from '../../lib/helpRequests'
import { fmtNum, fmtTime } from '../../lib/format'
import InstallHelper from '../../components/InstallHelper'

export const REQ_CHIP = { open: 'danger', acknowledged: 'sand', in_progress: 'primary', resolved: 'neutral' }

// Small neutral badge: this request reached us by SMS (help_requests.via = 'sms', logged from /r).
export function SmsBadge() {
  const { t } = useI18n()
  return (
    <span dir="ltr" className="inline-flex items-center gap-1 rounded-full border border-line bg-neutral-soft px-2 py-0.5 text-sm font-bold leading-tight text-muted">
      <Icon name="chat" className="size-3.5" />{t('lh.viaSms')}
    </span>
  )
}

// Leader's phone (campaigns.leader_phone): pilgrims call it and send SMS help requests to it.
// International format only (starts with +) so sms:/tel: links work from any country's SIM.
function LeaderPhoneField() {
  const { t } = useI18n()
  const { campaign, refreshMembership } = useSession()
  const [value, setValue] = useState(campaign?.leader_phone ?? '')
  const [msg, setMsg] = useState(null) // { tone, key }
  const [busy, setBusy] = useState(false)
  const clean = value.replace(/[\s-]/g, '')
  const valid = /^\+[1-9]\d{7,14}$/.test(clean)

  async function save(e) {
    e.preventDefault()
    if (!valid) return setMsg({ tone: 'sand', key: 'lh.phoneInvalid' })
    setBusy(true); setMsg(null)
    const { error, status } = await supabase.from('campaigns').update({ leader_phone: clean }).eq('id', campaign.id)
    setBusy(false)
    if (error) { console.warn(error); return setMsg({ tone: 'sand', key: isAuthError(error, status) ? 'newMsg.leaderSessionEnded' : 'lh.phoneFailed' }) }
    setValue(clean); setMsg({ tone: 'primary', key: 'lh.phoneSaved' })
    refreshMembership().catch(() => {}) // cached campaign gets the new number
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <label htmlFor="leader-phone" className="text-lg font-bold">{t('lh.phoneLabel')}</label>
      <input id="leader-phone" type="tel" inputMode="tel" dir="ltr" autoComplete="tel" placeholder="+966550102024"
        value={value} onChange={(e) => { setValue(e.target.value); setMsg(null) }}
        className="w-full rounded-[var(--radius-btn)] border border-line-strong bg-surface px-4 py-3 text-start text-lg outline-none focus:border-primary" />
      <p className="text-muted">{t('lh.phoneHint')}</p>
      {msg && <p className={`font-semibold ${msg.tone === 'primary' ? 'text-primary-ink' : 'text-sand-ink'}`}>{t(msg.key)}</p>}
      <Button type="submit" size="md" variant="secondary" disabled={busy || clean === (campaign?.leader_phone ?? '')}>{t('lh.phoneSave')}</Button>
    </form>
  )
}

// Screen 40 — leader home = requests: stats strip, NEW requests in red (real danger), then «قيد المتابعة»,
// then the assembly point with «تعديل» (53).
export default function LeaderHome() {
  const { t, lang } = useI18n()
  const { campaign, signOut } = useSession()
  const { members, pilgrims, messages, acks, openRequests } = useLeaderData()
  const byId = Object.fromEntries(members.map((m) => [m.id, m]))
  const arrival = arrivalStats(messages, acks, pilgrims)
  const fresh = openRequests.filter((r) => r.status === 'open')
  const following = openRequests.filter((r) => r.status !== 'open')

  const Stat = ({ n, label, to }) => (
    <Link to={to} className="flex-1 px-4 py-4 text-start">
      <div className="text-[2rem] font-bold leading-tight">{n}</div>
      <div className="text-muted">{label}</div>
    </Link>
  )

  return (
    <Screen nav={<BottomNav items={LEADER_NAV} />}>
      <LeaderHeader />
      <div className="flex flex-col gap-4 px-5 pt-3">
        <section className="flex divide-x divide-line-soft rounded-[var(--radius-card)] border border-line bg-surface">
          <Stat n={fmtNum(pilgrims.length, lang)} label={t('leader.statMembers')} to="/l/members" />
          <Stat n={arrival.latest ? fmtNum(arrival.count, lang) : '—'} label={t('leader.statArrived')} to="/l/members?f=arrived" />
          <Stat n={fmtNum(openRequests.length, lang)} label={t('leader.statRequests')} to="/l" />
        </section>

        {fresh.map((r) => (
          <article key={r.id} className="rounded-[var(--radius-card)] border border-danger-line bg-danger-soft p-5">
            <div className="flex items-center justify-between gap-2">
              <Chip tone="danger" className="bg-surface/70">{t('lh.newReq')}</Chip>
              <span className="flex items-center gap-2">
                {r.via === 'sms' && <SmsBadge />}
                <b dir="ltr">{requestCode(r)}</b>
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold">{t('lh.needsHelp', { name: byId[r.member_id]?.name ?? '—' })}</h2>
            <p className="mt-1 text-lg text-muted">
              {fmtTime(r.created_at, lang, t)} · {t(r.location_shared || byId[r.member_id]?.shared_lat != null ? 'lh.locShared' : 'lh.locNotShared')}
            </p>
            <Button variant="danger" className="mt-4 w-full" to={`/l/r/${r.id}`}>{t('lh.openReqBtn')}</Button>
          </article>
        ))}

        {following.length > 0 && <h2 className="mt-2 text-lg font-bold text-muted">{t('lh.following')}</h2>}
        {following.map((r) => (
          <Link key={r.id} to={`/l/r/${r.id}`} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xl font-bold">{byId[r.member_id]?.name ?? '—'}{r.via === 'sms' && <SmsBadge />}</div>
              <div className="mt-1 text-muted"><span dir="ltr">{requestCode(r)}</span> · {fmtTime(r.created_at, lang, t)}</div>
            </div>
            <Chip tone={REQ_CHIP[r.status]}>{t(`lh.st_${r.status}`)}</Chip>
          </Link>
        ))}
        {openRequests.length === 0 && <p className="rounded-[var(--radius-card)] border border-line bg-surface p-5 text-center text-muted">{t('lh.noOpen')}</p>}

        <section className="flex items-end gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <div className="min-w-0 flex-1">
            <div className="text-lg text-muted">{t('lh.assembly')}</div>
            <div className="mt-1 text-xl font-bold">
              {campaign?.assembly_point}{campaign?.assembly_time ? ` · ${fmtTime(campaign.assembly_time, lang, t, { long: true })}` : ''}
            </div>
          </div>
          <Link to="/l/assembly" className="px-1 py-1 text-lg font-bold text-primary">{t('lh.edit')}</Link>
        </section>

        {/* once after joining, until closed/installed (also inside «الإعدادات» below) */}
        <InstallHelper once />

        <details className="mt-2 rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4">
          <summary className="cursor-pointer text-lg font-bold text-muted">{t('lh.settings')}</summary>
          <div className="mt-4 flex flex-col gap-4">
            <TextSizeControl />
            <LeaderPhoneField />
            <InstallHelper />
            <Button variant="secondary" icon="logOut" iconClass="size-5 ltr:-scale-x-100"
              onClick={() => confirm(t('common.signOutConfirm')) && signOut()}>{t('common.signOut')}</Button>
          </div>
        </details>
      </div>
    </Screen>
  )
}

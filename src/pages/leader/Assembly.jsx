import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav, { LEADER_NAV } from '../../components/BottomNav'
import { Screen, TopBar } from '../../components/Layout'
import { Button, Notice } from '../../components/ui'
import Segmented from '../../components/Segmented'
import { useI18n } from '../../i18n'
import { isAuthError, useSession } from '../../lib/session'
import { supabase } from '../../lib/supabase'
import { fmtTime } from '../../lib/format'

const TZ_OFFSET_MIN = 180 // Makkah = UTC+3 (no DST)

// "HH:MM" (Makkah) on the same Makkah day as `baseIso` → ISO
function makkahTimeToIso(baseIso, hhmm) {
  const base = new Date(baseIso ?? Date.now())
  const local = new Date(base.getTime() + TZ_OFFSET_MIN * 60000) // shift to read the Makkah calendar day
  const [h, m] = hhmm.split(':').map(Number)
  const utc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), h, m) - TZ_OFFSET_MIN * 60000
  return new Date(utc).toISOString()
}

// Screen 53 — leader edits the assembly time (update campaigns — allowed for leaders). Pilgrims get it
// live (Realtime on campaigns → home alert, screen 12); offline ones when they're back.
export default function Assembly() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const { campaign } = useSession()
  const current = campaign?.assembly_time ?? new Date().toISOString()
  const options = useMemo(() => [0, 30, 60].map((m) => new Date(new Date(current).getTime() + m * 60000).toISOString()), [current])
  const [choice, setChoice] = useState(options[1])
  const [other, setOther] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const value = other ? makkahTimeToIso(current, other) : choice

  async function save() {
    setBusy(true); setErr(null)
    const { error, status } = await supabase.from('campaigns').update({ assembly_time: value }).eq('id', campaign.id)
    setBusy(false)
    if (error) { console.error(error); setErr(isAuthError(error, status) ? 'newMsg.leaderSessionEnded' : 'asm.saveFailed'); return }
    navigate('/l')
  }

  return (
    <Screen nav={<BottomNav items={LEADER_NAV} />}>
      <TopBar back="/l" title={t('asm.title')}
        subtitle={[campaign?.assembly_point, campaign?.camp].filter(Boolean).join(' · ')} />
      <div className="flex flex-col gap-4 px-5 pt-4">
        <Segmented value={other ? '' : choice} onChange={(v) => { setChoice(v); setOther('') }}
          options={options.map((iso) => ({ value: iso, label: fmtTime(iso, lang, t, { long: true }) }))} />
        <label className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-5 py-3">
          <span className="text-lg font-bold">{t('asm.otherTime')}</span>
          <input type="time" value={other} onChange={(e) => setOther(e.target.value)} dir="ltr"
            className="rounded-lg border border-line-strong px-3 py-2 text-lg" />
        </label>
        <p className="text-muted">{t('asm.note')}</p>
        {err && <Notice tone="danger">{t(err)}</Notice>}
        <Button onClick={save} disabled={busy || new Date(value).getTime() === new Date(campaign?.assembly_time).getTime()}>{t('asm.save')}</Button>
      </div>
    </Screen>
  )
}

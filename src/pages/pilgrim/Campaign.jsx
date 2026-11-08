import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Screen, TopBar } from '../../components/Layout'
import { Button, InfoCard, InfoRow } from '../../components/ui'
import { MessageCard } from '../../components/MessageCards'
import TextSizeControl from '../../components/TextSizeControl'
import { useCallLeader } from '../../components/CallLeader'
import { LANGS, useI18n } from '../../i18n'
import { useSession } from '../../lib/session'
import { usePilgrimMessages } from '../../lib/pilgrimMessages'
import { fmtDayTime, fmtTime } from '../../lib/format'
import InstallHelper from '../../components/InstallHelper'

const ORDER = ['ar', 'en', 'ur', 'id']

// Screen 33 — "حملتي" (+ settings on the same page): campaign info + call leader, leader messages
// (with original text — 36), language (34/35: switching flips the direction, you stay on this page),
// text size (37). Opens offline from the device cache.
export default function Campaign() {
  const { t, lang } = useI18n()
  const { campaign: c, signOut, changeLanguage } = useSession()
  const { messages } = usePilgrimMessages()
  const callLeader = useCallLeader()
  const { hash } = useLocation()
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }) }, [hash])

  return (
    <Screen>
      <TopBar back="/p" title={t('campaign.title')} />
      <div className="flex flex-col gap-4 px-5 pt-4">
        <InfoCard>
          <InfoRow label={t('myc.group')}>{c?.name}</InfoRow>
          <InfoRow label={t('myc.leader')} action={c?.leader_phone && (
            <Button size="md" icon="phone" iconClass="size-5" onClick={callLeader.call} className="min-h-[3.25rem] px-6 text-lg">{t('myc.call')}</Button>
          )}>{c?.leader_name}</InfoRow>
          <InfoRow label={t('myc.assembly')}>
            {c?.assembly_point}{c?.assembly_time ? ` · ${fmtTime(c.assembly_time, lang, t, { long: true })}` : ''}
          </InfoRow>
          {c?.camp && <InfoRow label={t('myc.camp')}>{c.camp}</InfoRow>}
          {c?.hotel && <InfoRow label={t('myc.hotel')}>{c.hotel}</InfoRow>}
        </InfoCard>
        {c?.updated_at && <p className="-mt-1 px-1 text-sm text-muted">{t('myc.lastUpdated', { time: fmtDayTime(c.updated_at, lang, t) })}</p>}

        <h2 id="messages" className="mt-3 text-[1.4rem] font-bold">{t('myc.leaderMessages')}</h2>
        {messages.length === 0 && <p className="text-muted">{t('msg.none')}</p>}
        {/* 33: listen + original only — «فهمت» lives on the home card / message page */}
        {messages.map((m) => <MessageCard key={m.id} m={m} highlight={false} showAck={false} />)}

        <h2 className="mt-3 text-[1.4rem] font-bold">{t('myc.language')}</h2>
        <div className="grid grid-cols-2 gap-3" role="radiogroup">
          {ORDER.map((code) => {
            const active = code === lang
            return (
              <button key={code} type="button" role="radio" aria-checked={active} onClick={() => changeLanguage(code)}
                dir={code === 'ar' || code === 'ur' ? 'rtl' : 'ltr'} lang={code}
                className={`flex min-h-16 items-center justify-center gap-2 rounded-[var(--radius-card)] border px-3 text-xl font-bold
                  ${code === 'ur' ? 'font-urdu' : 'font-sans'}
                  ${active ? 'border-primary bg-primary-soft text-primary-ink' : 'border-line bg-surface'}`}>
                {active && <Icon name="check" className="size-5" />}
                {LANGS.find((l) => l.code === code).label}
              </button>
            )
          })}
        </div>

        <div className="mt-3"><TextSizeControl /></div>

        <InstallHelper className="mt-3" />

        <Button variant="secondary" icon="logOut" iconClass="size-5 ltr:-scale-x-100" className="mt-4"
          onClick={() => confirm(t('common.signOutConfirm')) && signOut()}>{t('common.signOut')}</Button>
      </div>
      {callLeader.sheet}
    </Screen>
  )
}

import { useState } from 'react'
import { BottomSheet, Button, IconCircle } from './ui'
import { useI18n } from '../i18n'
import { useSession } from '../lib/session'
import { fmtPhone } from '../lib/format'

// Screen 13 — «اتصل بقائدي». On phones it dials directly (tel:); elsewhere (laptop demo) a sheet
// shows the leader's name + number with a «اتصل الآن» link.
export function useCallLeader() {
  const { campaign } = useSession()
  const [open, setOpen] = useState(false)
  const tel = campaign?.leader_phone ? `tel:${campaign.leader_phone.replace(/\s+/g, '')}` : null
  const call = () => {
    if (tel && window.matchMedia?.('(pointer: coarse)').matches) window.location.href = tel
    else setOpen(true)
  }
  const sheet = <CallLeaderSheet open={open} onClose={() => setOpen(false)} tel={tel} />
  return { call, sheet }
}

function CallLeaderSheet({ open, onClose, tel }) {
  const { t } = useI18n()
  const { campaign } = useSession()
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <IconCircle icon="phone" size="size-20" iconSize="size-9" />
        <h2 className="mt-4 text-2xl font-bold">{t('home.callTitle', { name: campaign?.leader_name ?? '' })}</h2>
        {campaign?.leader_phone && <p dir="ltr" className="mt-2 text-xl font-bold">{fmtPhone(campaign.leader_phone)}</p>}
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {tel && <Button href={tel} icon="phone">{t('home.callNow')}</Button>}
        <Button variant="secondary" onClick={onClose}>{t('home.close')}</Button>
      </div>
    </BottomSheet>
  )
}

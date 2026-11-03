import Icon from './Icon'
import { useI18n } from '../i18n'
import { useOnline } from '../lib/useOnline'

export default function StatusChip() {
  const { t } = useI18n()
  const online = useOnline()
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold leading-none
      ${online ? 'bg-mint text-mint-ink' : 'bg-chip text-ink'}`}>
      {online ? t('status.online') : t('status.offline')}
      <Icon name={online ? 'wifi' : 'wifiOff'} className="size-4" />
    </span>
  )
}

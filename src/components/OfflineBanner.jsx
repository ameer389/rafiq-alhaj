import Icon from './Icon'
import { useI18n } from '../i18n'
import { useOnline } from '../lib/useOnline'

// Calm, small strip at the very top while offline (neutral — offline is not an error, screen 10).
// Disappears by itself when the network returns.
export default function OfflineBanner() {
  const { t } = useI18n()
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" aria-live="polite"
      className="sticky top-0 z-30 mx-auto flex w-full max-w-[430px] items-center justify-center gap-2 border-b border-line bg-neutral-soft px-4 py-2 text-base font-semibold text-ink">
      <Icon name="wifiOff" className="size-5 shrink-0 text-muted" />
      <span>{t('offline.banner')}</span>
    </div>
  )
}

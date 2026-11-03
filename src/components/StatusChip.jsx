import { useI18n } from '../i18n'
import { useOnline } from '../lib/useOnline'

// Screens 09/10: white outlined pill with a dot — filled green = online, hollow = offline.
// Calm on purpose: offline is not an error.
export default function StatusChip() {
  const { t } = useI18n()
  const online = useOnline()
  return (
    <span role="status" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[0.95rem] font-semibold leading-none text-ink">
      <span aria-hidden="true" className={`size-2.5 rounded-full ${online ? 'bg-primary' : 'border-2 border-muted/70'}`} />
      {online ? t('status.online') : t('status.offline')}
    </span>
  )
}

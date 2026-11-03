import Icon from './Icon'
import { useI18n } from '../i18n'
import { fmtTime } from '../lib/format'

// Cream "assembly point" card (designs 04, 16). `aside` = pill on the far side.
export default function AssemblyCard({ campaign, aside }) {
  const { t, lang } = useI18n()
  if (!campaign) return null
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-sand-line bg-sand-soft p-4">
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-sand text-primary-dark">
        <Icon name="flag" className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-muted">{t('home.assemblyPoint')}</div>
        <div className="text-xl font-bold">{campaign.assembly_point}</div>
        {campaign.assembly_time && (
          <div className="mt-0.5 flex items-center gap-1.5 text-muted">
            <Icon name="clock" className="size-4" />
            <span>{fmtTime(campaign.assembly_time, lang, t)}</span>
          </div>
        )}
      </div>
      {aside}
    </div>
  )
}

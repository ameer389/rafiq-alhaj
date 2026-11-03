import Icon from './Icon'
import { useI18n } from '../i18n'

// "32 / 40 فهموا" + progress bar. size: 'sm' (list rows) | 'lg' (home / details)
export default function AckCounter({ count, total, size = 'sm', label = 'acks.understood' }) {
  const { t } = useI18n()
  const pct = total ? Math.round((count / total) * 100) : 0
  const all = total > 0 && count >= total
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className={`font-bold tabular-nums ${all ? 'text-success' : 'text-ink'} ${size === 'lg' ? 'text-4xl' : 'text-xl'}`} dir="ltr">
          {count} <span className="text-muted">/ {total}</span>
        </span>
        <span className={`font-semibold text-muted ${size === 'lg' ? 'text-lg' : ''}`}>{t(label)}</span>
        {all && <Icon name="checkCircle" className={`${size === 'lg' ? 'size-7' : 'size-5'} text-success`} />}
      </div>
      <div className={`mt-2 overflow-hidden rounded-full bg-chip ${size === 'lg' ? 'h-3' : 'h-2'}`}>
        <div className="h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

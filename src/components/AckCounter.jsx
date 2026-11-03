import Icon from './Icon'
import { useI18n } from '../i18n'
import { fmtNum } from '../lib/format'

// "32 / 40 فهموا" + progress bar. size: 'sm' (list rows) | 'lg' (home / details)
export default function AckCounter({ count, total, size = 'sm', label = 'acks.understood' }) {
  const { t, lang } = useI18n()
  const pct = total ? Math.round((count / total) * 100) : 0
  const all = total > 0 && count >= total
  return (
    <div>
      <div className="flex items-baseline gap-2">
        {/* LTR flex keeps "count / total" in order for Arabic-Indic digits too (bidi would flip them) */}
        <span className={`inline-flex gap-1.5 font-bold tabular-nums ${all ? 'text-primary' : 'text-ink'} ${size === 'lg' ? 'text-4xl' : 'text-xl'}`} dir="ltr">
          <span>{fmtNum(count, lang)}</span><span className="text-muted">/</span><span className="text-muted">{fmtNum(total, lang)}</span>
        </span>
        <span className={`font-semibold text-muted ${size === 'lg' ? 'text-lg' : ''}`}>{t(label)}</span>
        {all && <Icon name="checkCircle" className={`${size === 'lg' ? 'size-7' : 'size-5'} text-primary`} />}
      </div>
      <div className={`mt-2 overflow-hidden rounded-full bg-neutral-soft ${size === 'lg' ? 'h-3' : 'h-2'}`}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

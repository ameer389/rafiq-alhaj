// Neutral track with a white "selected" pill (recipients, priority, text size).
// options: [{ value, label, disabled?, title? }]
export default function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 rounded-[var(--radius-btn)] border border-line bg-neutral-soft p-1 ${className}`} role="radiogroup">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={active}
            disabled={o.disabled} title={o.title} onClick={() => onChange(o.value)}
            className={`min-h-12 flex-1 rounded-xl px-2 py-2.5 text-[1.05rem] font-bold leading-tight transition
              ${active ? 'border border-line bg-surface text-primary shadow-[0_1px_3px_rgba(23,41,43,0.10)]' : 'text-muted'}
              disabled:opacity-45`}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

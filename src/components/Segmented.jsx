// Grey pill track with a white "selected" pill (design 18: recipients, priority).
// options: [{ value, label, disabled?, title? }]
export default function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 rounded-2xl bg-chip p-1 ${className}`} role="radiogroup">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={active}
            disabled={o.disabled} title={o.title} onClick={() => onChange(o.value)}
            className={`flex-1 rounded-xl px-2 py-3 text-[1.05rem] font-bold leading-tight transition
              ${active ? 'bg-white text-ink shadow-[0_1px_4px_rgba(0,0,0,0.12)]' : 'text-muted'}
              disabled:opacity-45`}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

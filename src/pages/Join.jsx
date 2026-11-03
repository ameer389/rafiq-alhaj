import { useState } from 'react'
import Icon from '../components/Icon'
import StatusChip from '../components/StatusChip'
import { LANGS, useI18n } from '../i18n'
import { useSession } from '../lib/session'

// Feature 0 — onboarding: language → campaign code → name.
// Pilgrim code (NOOR24) joins as pilgrim; leader code (NOOR24-L) joins as leader (decided by the RPC).
export default function Join() {
  const { t, lang, setLang } = useI18n()
  const { join } = useSession()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setErr('join.errName')
    if (!code.trim()) return setErr('join.errInvalid')
    setBusy(true); setErr(null)
    const errKey = await join({ code, name, lang })
    setBusy(false)
    if (errKey) setErr(errKey)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-page">
      <header className="rounded-b-[1.75rem] bg-navy-900 px-5 pb-8 pt-6 text-white">
        <div className="flex justify-end"><StatusChip /></div>
        <div className="mt-4 flex items-center gap-3">
          <span className="grid size-14 place-items-center rounded-full bg-gold text-navy-900">
            <Icon name="users" className="size-7" />
          </span>
          <div>
            <h1 className="text-[1.75rem] font-bold leading-tight">{t('app.name')}</h1>
            <p className="text-white/75">{t('app.tagline')}</p>
          </div>
        </div>
      </header>

      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-5 px-5 py-6">
        <section>
          <h2 className="mb-2.5 font-bold">{t('join.chooseLang')}</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {LANGS.map((l) => (
              <button type="button" key={l.code} onClick={() => setLang(l.code)}
                dir={l.code === 'ar' || l.code === 'ur' ? 'rtl' : 'ltr'}
                className={`rounded-2xl border px-3 py-3.5 text-lg font-semibold transition
                  ${lang === l.code ? 'border-navy-800 bg-navy-800 text-white' : 'border-line bg-white text-ink'}`}>
                {l.label}
              </button>
            ))}
          </div>
        </section>

        <label className="block">
          <span className="mb-2 block font-bold">{t('join.code')}</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t('join.codePh')} dir="ltr" autoCapitalize="characters" autoComplete="off"
            className="w-full rounded-2xl border border-line-strong/60 bg-white px-4 py-3.5 text-center text-xl font-bold tracking-widest outline-none focus:border-navy-800" />
          <span className="mt-1.5 block text-sm text-muted">{t('join.leaderHint')}</span>
        </label>

        <label className="block">
          <span className="mb-2 block font-bold">{t('join.name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('join.namePh')}
            autoComplete="name"
            className="w-full rounded-2xl border border-line-strong/60 bg-white px-4 py-3.5 text-lg outline-none focus:border-navy-800" />
        </label>

        {err && <p className="rounded-xl bg-danger-soft px-4 py-3 font-semibold text-danger-ink">{t(err)}</p>}

        <button disabled={busy}
          className="mt-auto flex items-center justify-center gap-2 rounded-2xl bg-navy-800 py-4 text-lg font-bold text-white disabled:opacity-60">
          {busy ? t('join.joining') : t('join.submit')}
        </button>
      </form>
    </div>
  )
}

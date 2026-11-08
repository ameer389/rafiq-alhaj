import { useState } from 'react'
import Icon from './Icon'
import { Button } from './ui'
import { useI18n } from '../i18n'
import { promptInstall, useInstall } from '../lib/install'
import { load, save } from '../lib/storage'
import { fmtNum } from '../lib/format'

const DONE_KEY = 'rafiq.installHintDone'

// "Add to home screen" helper.
//  - Android / Chrome: one big button → the browser's install dialog.
//  - iOS Safari: 3 short illustrated steps (Share → "Add to Home Screen" → Add).
//  - Hidden when already running from the home screen, or when the browser can't install.
// once: shown on home after joining until the pilgrim closes it / installs (then never again there).
//       Without `once` (My campaign page) it stays available.
export default function InstallHelper({ once = false, className = '' }) {
  const { t, lang } = useI18n()
  const { standalone, installed, canPrompt, ios } = useInstall()
  const [hidden, setHidden] = useState(() => once && !!load(DONE_KEY))
  if (standalone || installed || hidden || (!canPrompt && !ios)) return null

  const close = () => { save(DONE_KEY, true); setHidden(true) }
  const install = async () => { await promptInstall(); if (once) close() }

  const steps = [
    { icon: 'share', text: t('install.ios1') },
    { icon: 'squarePlus', text: t('install.ios2') },
    { icon: 'check', text: t('install.ios3') },
  ]

  return (
    <section className={`rounded-[var(--radius-card)] border border-line bg-surface p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" width="56" height="56"
          className="size-14 shrink-0 rounded-[0.9rem] border border-line-soft bg-white" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-snug">{t('install.title')}</h2>
          <p className="mt-1 text-lg leading-relaxed text-muted">{t('install.body')}</p>
        </div>
      </div>

      {canPrompt ? (
        <Button icon="download" className="mt-4 w-full" onClick={install}>{t('install.button')}</Button>
      ) : (
        <ol className="mt-4 flex flex-col gap-2.5">
          {steps.map((s, i) => (
            <li key={s.icon} className="flex items-center gap-3 rounded-[var(--radius-btn)] bg-neutral-soft px-4 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-base font-bold text-white">{fmtNum(i + 1, lang)}</span>
              <span className="min-w-0 flex-1 text-lg font-semibold leading-snug">{s.text}</span>
              {/* the real iOS glyph, so the pilgrim recognises the button in Safari's toolbar */}
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-primary">
                <Icon name={s.icon} className="size-6" />
              </span>
            </li>
          ))}
        </ol>
      )}

      {once && (
        <button type="button" onClick={close} className="mt-3 w-full py-2 text-lg font-bold text-primary">{t('install.later')}</button>
      )}
    </section>
  )
}

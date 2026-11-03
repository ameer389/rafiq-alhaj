import { useI18n } from '../i18n'
import { fmtTime } from '../lib/format'

// Screen 09 — green hero: "مجموعتك تنتظرك عند / البوابة ٣ / الساعة ٤:٣٠ مساءً / (camp)".
// Green = safety. `aside` renders under the text (e.g. the leader's "وصلوا" pill).
export default function AssemblyCard({ campaign, aside }) {
  const { t, lang } = useI18n()
  if (!campaign) return null
  return (
    <section className="rounded-[var(--radius-hero)] bg-primary px-6 py-6 text-white" aria-live="polite">
      <div className="text-lg text-white/85">{t('home.waitsAt')}</div>
      <div className="mt-1 text-[2.6rem] font-bold leading-tight">{campaign.assembly_point}</div>
      {campaign.assembly_time && (
        <div className="mt-1 text-xl font-bold">{t('home.atTime', { time: fmtTime(campaign.assembly_time, lang, t, { long: true }) })}</div>
      )}
      {campaign.camp && <div className="mt-3 text-white/85">{campaign.camp}</div>}
      {aside && <div className="mt-4">{aside}</div>}
    </section>
  )
}

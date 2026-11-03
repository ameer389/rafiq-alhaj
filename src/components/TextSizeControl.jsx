import Segmented from './Segmented'
import { useI18n } from '../i18n'
import { TEXT_SIZES, useTextSize } from '../lib/textSize'

// Screen 37 — "حجم الخط": normal / large / larger. Saved on the device, applies to the whole app instantly.
export default function TextSizeControl() {
  const { t } = useI18n()
  const [size, setSize] = useTextSize()
  return (
    <section>
      <h2 className="mb-2 text-lg font-bold">{t('settings.textSize')}</h2>
      <Segmented value={size} onChange={setSize}
        options={TEXT_SIZES.map((s) => ({ value: s, label: t(`settings.${s}`) }))} />
      <p className="mt-2 text-muted">{t('settings.preview')}</p>
    </section>
  )
}

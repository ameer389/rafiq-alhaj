import BottomNav from '../components/BottomNav'
import Icon from '../components/Icon'
import { Screen, TopBar } from '../components/Layout'
import { useI18n } from '../i18n'

// Placeholder for features not built yet.
export default function Soon({ nav, back, title }) {
  const { t } = useI18n()
  return (
    <Screen nav={nav && <BottomNav items={nav} />}>
      <TopBar title={title ? t(title) : t('common.soon')} back={back} />
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-muted">
        <span className="grid size-16 place-items-center rounded-full bg-cream text-gold-ink"><Icon name="clock" className="size-8" /></span>
        <p className="text-lg font-bold text-ink">{t('common.soon')}</p>
        <p>{t('common.soonBody')}</p>
      </div>
    </Screen>
  )
}

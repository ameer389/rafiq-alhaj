import { AppHeader } from './Layout'
import { useI18n } from '../i18n'
import { useSession } from '../lib/session'

// Leader tabs (40 / 44 / 50): campaign name + "قائد الحملة · name" + status chip.
export default function LeaderHeader() {
  const { t } = useI18n()
  const { campaign, member } = useSession()
  return <AppHeader title={campaign?.name} subtitle={t('lh.subtitle', { name: member?.name ?? '' })} />
}

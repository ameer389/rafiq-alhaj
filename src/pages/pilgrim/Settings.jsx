import BottomNav, { PILGRIM_NAV } from '../../components/BottomNav'
import Icon from '../../components/Icon'
import { Card, Screen, TopBar } from '../../components/Layout'
import { langLabel, useI18n } from '../../i18n'
import { useSession } from '../../lib/session'
import TextSizeControl from '../../components/TextSizeControl'

export default function Settings() {
  const { t } = useI18n()
  const { member, campaign, signOut } = useSession()
  return (
    <Screen nav={<BottomNav items={PILGRIM_NAV} />}>
      <TopBar title={t('nav.settings')} />
      <div className="flex flex-col gap-4 px-4 py-5">
        <Card className="divide-y divide-line">
          <div className="flex justify-between gap-3 p-4"><span className="text-muted">{t('join.name')}</span><b>{member?.name}</b></div>
          <div className="flex justify-between gap-3 p-4"><span className="text-muted">{t('nav.myCampaign')}</span><b>{campaign?.name}</b></div>
          <div className="flex justify-between gap-3 p-4"><span className="text-muted">{t('common.language')}</span><b>{langLabel(member?.lang)}</b></div>
        </Card>
        <TextSizeControl />
        <button onClick={() => confirm(t('common.signOutConfirm')) && signOut()}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-danger/50 bg-white py-3.5 font-bold text-danger-ink">
          <Icon name="logOut" className="size-5 ltr:-scale-x-100" />{t('common.signOut')}
        </button>
      </div>
    </Screen>
  )
}

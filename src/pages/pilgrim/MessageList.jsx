import { MessageListItem } from '../../components/MessageCards'
import { Screen, TopBar } from '../../components/Layout'
import { useI18n } from '../../i18n'
import { usePilgrimMessages } from '../../lib/pilgrimMessages'

export default function MessageList() {
  const { t } = useI18n()
  const { messages } = usePilgrimMessages()
  return (
    <Screen>
      <TopBar title={t('msg.all')} back="/p" />
      <div className="flex flex-col gap-3 px-4 py-5">
        {messages.length === 0 && <p className="py-12 text-center text-muted">{t('msg.none')}</p>}
        {messages.map((m) => <MessageListItem key={m.id} m={m} />)}
      </div>
    </Screen>
  )
}

import { useParams } from 'react-router-dom'
import { Screen, TopBar } from '../../components/Layout'
import { Notice } from '../../components/ui'
import { MessageCard } from '../../components/MessageCards'
import AssemblyCard from '../../components/AssemblyCard'
import { useI18n } from '../../i18n'
import { useSession } from '../../lib/session'
import { usePilgrimMessages } from '../../lib/pilgrimMessages'
import { isArrival } from '../../lib/arrival'

// One leader message (deep link from the banner / home). Same card as home & "حملتي" (09/34/35/36),
// with «فهمت» while unconfirmed; arrival checks also show where to go.
export default function Message() {
  const { id } = useParams()
  const { t } = useI18n()
  const { campaign } = useSession()
  const { messages, acked } = usePilgrimMessages()
  const m = messages.find((x) => x.id === id)
  const arrival = isArrival(m)

  return (
    <Screen>
      <TopBar back="/p" title={t(arrival ? 'arrival.title' : 'home.msgFromLeader')} />
      <div className="flex flex-col gap-4 px-5 pt-4">
        {!m && <p className="py-12 text-center text-muted">{t('msg.notFound')}</p>}
        {m && <MessageCard m={m} highlight={false} />}
        {m && acked.has(m.id) && (
          <Notice tone="primary" icon="checkCircle">{t(arrival ? 'arrival.confirmed' : 'msg.confirmed')}</Notice>
        )}
        {arrival && <AssemblyCard campaign={campaign} />}
      </div>
    </Screen>
  )
}

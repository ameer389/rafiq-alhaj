import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AckCounter from '../../components/AckCounter'
import BottomNav, { LEADER_NAV } from '../../components/BottomNav'
import Icon from '../../components/Icon'
import { Screen, TopBar } from '../../components/Layout'
import { useI18n } from '../../i18n'
import { ackStats, useLeaderData } from '../../lib/leaderData'
import { fmtTime } from '../../lib/format'
import { isArrival, recipientsOf, translationLangs } from '../../lib/arrival'

export const PRIORITY_STYLE = {
  normal: 'bg-chip text-muted',
  important: 'bg-cream text-gold-ink',
  urgent: 'bg-danger-soft text-danger-ink',
}

// Leader — sent messages (newest first) with live "x / y فهموا" counters.
export default function Messages() {
  const { t, lang } = useI18n()
  const { messages, acks, pilgrims } = useLeaderData()
  const location = useLocation()
  const [toast, setToast] = useState(!!location.state?.sent)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(false), 3000)
    return () => clearTimeout(id)
  }, [toast])

  return (
    <Screen nav={<BottomNav items={LEADER_NAV} />}>
      <TopBar title={t('nav.messages')} />
      {toast && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-2xl bg-mint px-4 py-3 font-bold text-mint-ink">
          <Icon name="checkCircle" className="size-5" />{t('newMsg.sent')}
        </div>
      )}
      <div className="flex flex-col gap-3 px-4 py-4">
        <Link to="/l/new" className="flex items-center justify-center gap-2.5 rounded-2xl bg-navy-800 py-4 text-lg font-bold text-white">
          <Icon name="megaphone" className="size-6 text-gold" />{t('messages.newMessage')}
        </Link>
        {messages === null && <p className="py-8 text-center text-muted">{t('common.loading')}</p>}
        {messages?.length === 0 && <p className="py-8 text-center text-muted">{t('messages.empty')}</p>}
        {messages?.map((m) => {
          const { count, total } = ackStats(m, acks, pilgrims)
          const arrival = isArrival(m)
          const to = recipientsOf(m)
          return (
            <Link key={m.id} to={`/l/m/${m.id}`} className="block rounded-[var(--radius-card)] border border-line bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                {arrival ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-sm font-bold text-mint-ink">
                    <Icon name="userCheck" className="size-4" />{t('arrival.title')}
                  </span>
                ) : (
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${PRIORITY_STYLE[m.priority] ?? PRIORITY_STYLE.normal}`}>
                    {t(`priority.${m.priority}`)}
                  </span>
                )}
                <span className="text-sm text-muted">{fmtTime(m.created_at, lang, t)}</span>
              </div>
              <p dir="rtl" className="mb-1 text-lg leading-relaxed">{m.original_text}</p>
              {to && <p className="text-sm font-semibold text-gold-ink">{t('arrival.toNotArrived', { n: to.length })}</p>}
              <div className="mt-3"><AckCounter count={count} total={total} label={arrival ? 'arrival.label' : 'acks.understood'} /></div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-mint-ink">
                  {!arrival && <><Icon name="languages" className="size-4" />{translationLangs(m).join(' · ').toUpperCase()}</>}
                </span>
                <span className="flex items-center gap-1 font-bold text-navy-800">
                  {t('acks.details')}<Icon name="chevronLeft" className="size-4 ltr:-scale-x-100" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </Screen>
  )
}

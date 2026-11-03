import { useParams } from 'react-router-dom'
import AckCounter from '../../components/AckCounter'
import Icon from '../../components/Icon'
import { Card, Screen, TopBar } from '../../components/Layout'
import { isRtl, langLabel, useI18n } from '../../i18n'
import { ackStats, useLeaderData } from '../../lib/leaderData'
import { fmtTime } from '../../lib/format'
import { PRIORITY_STYLE } from './Messages'
import { isArrival, recipientsOf, translationLangs } from '../../lib/arrival'

function MemberRow({ m, right }) {
  const { lang } = useI18n()
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cream font-bold text-gold-ink">{m.name.trim()[0]}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold">{m.name}</div>
        <div className="text-sm text-muted">{langLabel(m.lang)}</div>
      </div>
      {right && <span className="text-sm text-muted" dir={isRtl(lang) ? 'rtl' : 'ltr'}>{right}</span>}
    </li>
  )
}

// Leader — one message: live "x / y فهموا" + who hasn't confirmed yet.
export default function MessageDetail() {
  const { id } = useParams()
  const { t, lang } = useI18n()
  const { messages, acks, pilgrims } = useLeaderData()
  const m = messages?.find((x) => x.id === id)

  if (!m) {
    return (
      <Screen>
        <TopBar title={t('acks.title')} back="/l/messages" />
        <p className="py-16 text-center text-muted">{messages ? t('msg.notFound') : t('common.loading')}</p>
      </Screen>
    )
  }

  const { confirmed, pending, count, total, byMember } = ackStats(m, acks, pilgrims)
  const translations = translationLangs(m).map((l) => [l, m.translations[l]])
  const arrival = isArrival(m)
  const to = recipientsOf(m)

  return (
    <Screen>
      <TopBar title={t(arrival ? 'arrival.detailTitle' : 'acks.title')} back="/l/messages" />
      <div className="flex flex-col gap-4 px-4 py-5">
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${PRIORITY_STYLE[m.priority] ?? PRIORITY_STYLE.normal}`}>{t(`priority.${m.priority}`)}</span>
            <span className="text-sm text-muted">{fmtTime(m.created_at, lang, t)}</span>
          </div>
          <p dir="rtl" lang="ar" className="text-xl font-bold leading-relaxed">{m.original_text}</p>
          {to && <p className="mt-2 text-sm font-semibold text-gold-ink">{t('arrival.toNotArrived', { n: to.length })}</p>}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-success">
            <span className="size-2 animate-pulse rounded-full bg-success" />{t('acks.live')}
          </div>
          <AckCounter count={count} total={total} size="lg" label={arrival ? 'arrival.label' : 'acks.understood'} />
        </Card>

        <Card className="px-4 pt-4">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="clock" className="size-5 text-gold-ink" />{t(arrival ? 'arrival.notArrived' : 'acks.notConfirmed')} ({pending.length})
          </h2>
          {pending.length === 0
            ? <p className="py-4 font-bold text-success">{t(arrival ? 'arrival.allArrived' : 'acks.allConfirmed')} ✓</p>
            : <ul className="divide-y divide-line">{pending.map((p) => <MemberRow key={p.id} m={p} />)}</ul>}
        </Card>

        {confirmed.length > 0 && (
          <Card className="px-4 pt-4">
            <h2 className="flex items-center gap-2 font-bold">
              <Icon name="checkCircle" className="size-5 text-success" />{t(arrival ? 'arrival.arrivedList' : 'acks.confirmed')} ({confirmed.length})
            </h2>
            <ul className="divide-y divide-line">
              {confirmed.map((p) => <MemberRow key={p.id} m={p} right={fmtTime(byMember[p.id], lang, t)} />)}
            </ul>
          </Card>
        )}

        {translations.length > 0 && !arrival && (
          <details className="rounded-[var(--radius-card)] bg-mint p-4">
            <summary className="flex cursor-pointer items-center gap-2 font-bold text-mint-ink">
              <Icon name="languages" className="size-5" />{t('acks.translations')}
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {translations.map(([l, txt]) => (
                <div key={l}>
                  <div className="text-sm font-bold text-muted">{langLabel(l)}</div>
                  <p dir={isRtl(l) ? 'rtl' : 'ltr'} lang={l} className={`leading-relaxed ${l === 'ur' ? 'font-urdu' : ''}`}>{txt}</p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </Screen>
  )
}

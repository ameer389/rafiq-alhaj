import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BottomNav, { LEADER_NAV } from '../../components/BottomNav'
import Icon from '../../components/Icon'
import { Card, Screen, TopBar } from '../../components/Layout'
import { useI18n } from '../../i18n'
import { useSession } from '../../lib/session'
import { supabase } from '../../lib/supabase'
import { fmtTime } from '../../lib/format'

export const PRIORITY_STYLE = {
  normal: 'bg-chip text-muted',
  important: 'bg-cream text-gold-ink',
  urgent: 'bg-danger-soft text-danger-ink',
}

// Leader — sent messages (newest first). Per-message counters come in feature 3.
export default function Messages() {
  const { t, lang } = useI18n()
  const { campaign } = useSession()
  const location = useLocation()
  const [messages, setMessages] = useState(null)
  const [toast, setToast] = useState(!!location.state?.sent)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(false), 3000)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!campaign?.id) return
    supabase.from('messages').select('*').eq('campaign_id', campaign.id).order('created_at', { ascending: false })
      .then(({ data, error }) => { if (error) console.error(error); setMessages(data ?? []) })
  }, [campaign?.id])

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
        {messages?.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${PRIORITY_STYLE[m.priority] ?? PRIORITY_STYLE.normal}`}>
                {t(`priority.${m.priority}`)}
              </span>
              <span className="text-sm text-muted">{fmtTime(m.created_at, lang, t)}</span>
            </div>
            <p dir="rtl" className="text-lg leading-relaxed">{m.original_text}</p>
            <div className="mt-2 flex items-center gap-1.5 text-sm text-mint-ink">
              <Icon name="languages" className="size-4" />
              {Object.keys(m.translations ?? {}).filter((l) => l !== 'ar').join(' · ').toUpperCase()}
            </div>
          </Card>
        ))}
      </div>
    </Screen>
  )
}

import { Navigate, Route, Routes } from 'react-router-dom'
import { useI18n } from './i18n'
import { useSession } from './lib/session'
import { LEADER_NAV, PILGRIM_NAV } from './components/BottomNav'
import Join from './pages/Join'
import Soon from './pages/Soon'
import PilgrimHome from './pages/pilgrim/Home'
import Settings from './pages/pilgrim/Settings'
import Message from './pages/pilgrim/Message'
import MessageList from './pages/pilgrim/MessageList'
import { PilgrimMessagesProvider } from './lib/pilgrimMessages'
import { IncomingBanner } from './components/MessageCards'
import LeaderHome from './pages/leader/Home'
import NewMessage from './pages/leader/NewMessage'
import Messages from './pages/leader/Messages'
import MessageDetail from './pages/leader/MessageDetail'
import { LeaderDataProvider } from './lib/leaderData'

function Splash() {
  const { t } = useI18n()
  return <div className="grid min-h-dvh place-items-center bg-navy-900 text-xl font-bold text-white">{t('app.name')}</div>
}

export default function App() {
  const { member, loading, isLeader } = useSession()

  // Show splash only on the very first load (no cached session yet).
  if (loading && !member) return <Splash />
  if (!member) return <Join />

  return isLeader ? (
    <LeaderDataProvider>
    <Routes>
      <Route path="/l" element={<LeaderHome />} />
      <Route path="/l/m/:id" element={<MessageDetail />} />
      <Route path="/l/requests" element={<Soon nav={LEADER_NAV} title="nav.requests" />} />
      <Route path="/l/members" element={<Soon nav={LEADER_NAV} title="nav.members" />} />
      <Route path="/l/messages" element={<Messages />} />
      <Route path="/l/new" element={<NewMessage />} />
      <Route path="/l/*" element={<Soon back="/l" />} />
      <Route path="*" element={<Navigate to="/l" replace />} />
    </Routes>
    </LeaderDataProvider>
  ) : (
    <PilgrimMessagesProvider>
    <IncomingBanner />
    <Routes>
      <Route path="/p" element={<PilgrimHome />} />
      <Route path="/p/m/:id" element={<Message />} />
      <Route path="/p/messages" element={<MessageList />} />
      <Route path="/p/assistant" element={<Soon nav={PILGRIM_NAV} title="nav.assistant" />} />
      <Route path="/p/campaign" element={<Soon nav={PILGRIM_NAV} title="nav.myCampaign" />} />
      <Route path="/p/settings" element={<Settings />} />
      <Route path="/p/*" element={<Soon back="/p" />} />
      <Route path="*" element={<Navigate to="/p" replace />} />
    </Routes>
    </PilgrimMessagesProvider>
  )
}

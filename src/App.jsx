import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useI18n } from './i18n'
import { useSession } from './lib/session'
import { LEADER_NAV } from './components/BottomNav'
import Join from './pages/Join'
import Soon from './pages/Soon'
import PilgrimHome from './pages/pilgrim/Home'
import Message from './pages/pilgrim/Message'
import Campaign from './pages/pilgrim/Campaign'
import HelpStatus, { HelpIndex } from './pages/pilgrim/Help'
import Lost from './pages/pilgrim/Lost'
import RouteScreen from './pages/pilgrim/Route'
import { HelpRequestsProvider } from './lib/helpRequests'
import { PilgrimMessagesProvider } from './lib/pilgrimMessages'
import { IncomingBanner } from './components/MessageCards'
import LeaderHome from './pages/leader/Home'
import Messages from './pages/leader/Messages'
import MessageDetail from './pages/leader/MessageDetail'
import RequestDetail from './pages/leader/RequestDetail'
import Members from './pages/leader/Members'
import MemberDetail from './pages/leader/MemberDetail'
import Assembly from './pages/leader/Assembly'
import SmsLog, { SmsLeaderLogin } from './pages/leader/SmsLog'
import { LeaderDataProvider } from './lib/leaderData'
import OfflineBanner from './components/OfflineBanner'

function Splash() {
  const { t } = useI18n()
  return <div className="grid min-h-dvh place-items-center bg-primary-dark text-xl font-bold text-white">{t('app.name')}</div>
}

// Calm "offline — the app works" strip on every screen (incl. join), above the routes.
export default function App() {
  return (
    <>
      <OfflineBanner />
      <AppRoutes />
    </>
  )
}

function AppRoutes() {
  const { member, loading, isLeader } = useSession()

  const { pathname } = useLocation()

  // Show splash only on the very first load (no cached session yet).
  if (loading && !member) return <Splash />
  // /r = link from a pilgrim's SMS. Not a leader here (no session / pilgrim) → sign in as leader first;
  // the URL (and its params) stays, so <SmsLog/> continues automatically after sign-in.
  if (pathname === '/r' && !isLeader) return <SmsLeaderLogin />
  if (!member) return <Join />

  return isLeader ? (
    <LeaderDataProvider>
    <Routes>
      <Route path="/l" element={<LeaderHome />} />
      <Route path="/l/r/:id" element={<RequestDetail />} />
      <Route path="/l/members" element={<Members />} />
      <Route path="/l/members/:id" element={<MemberDetail />} />
      <Route path="/l/messages" element={<Messages />} />
      <Route path="/l/m/:id" element={<MessageDetail />} />
      <Route path="/l/assembly" element={<Assembly />} />
      <Route path="/r" element={<SmsLog />} />
      {/* old links */}
      <Route path="/l/requests" element={<Navigate to="/l" replace />} />
      <Route path="/l/new" element={<Navigate to="/l/messages" replace />} />
      <Route path="*" element={<Navigate to="/l" replace />} />
    </Routes>
    </LeaderDataProvider>
  ) : (
    <PilgrimMessagesProvider>
    <HelpRequestsProvider>
    <IncomingBanner />
    <Routes>
      <Route path="/p" element={<PilgrimHome />} />
      <Route path="/p/m/:id" element={<Message />} />
      <Route path="/p/messages" element={<Navigate to="/p/campaign" replace />} />
      <Route path="/p/campaign" element={<Campaign />} />
      <Route path="/p/lost" element={<Lost />} />
      <Route path="/p/route" element={<RouteScreen />} />
      <Route path="/p/help" element={<HelpIndex />} />
      <Route path="/p/help/:cid" element={<HelpStatus />} />
      <Route path="/p/settings" element={<Navigate to="/p/campaign" replace />} />
      <Route path="/p/*" element={<Soon back="/p" />} />
      <Route path="*" element={<Navigate to="/p" replace />} />
    </Routes>
    </HelpRequestsProvider>
    </PilgrimMessagesProvider>
  )
}

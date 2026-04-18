import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

// Layout
import Layout from './components/layout/Layout'
import AdminGuard from './components/layout/AdminGuard'

// Pagine utente
import AuthPage       from './pages/Auth'
import HomePage       from './pages/Home'
import IdeasPage      from './pages/Ideas'
import RulesPage      from './pages/Rules'
import VotePage       from './pages/Vote'
import ReportsPage    from './pages/Reports'
import ProfilePage    from './pages/Profile'

// Pagine admin
import AdminDashboard   from './pages/admin/AdminDashboard'
import AdminIdeas       from './pages/admin/AdminIdeas'
import AdminUsers       from './pages/admin/AdminUsers'
import AdminReports     from './pages/admin/AdminReports'
import AdminRules       from './pages/admin/AdminRules'
import AdminBannedWords from './pages/admin/AdminBannedWords'

function AppContent() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-2)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.88rem',
          },
          success: { iconTheme: { primary: 'var(--success)', secondary: 'var(--bg-2)' } },
          error:   { iconTheme: { primary: 'var(--danger)',  secondary: 'var(--bg-2)' } },
        }}
      />
      <Routes>
        {/* Auth */}
        <Route path="/auth" element={<AuthPage />} />

        {/* App autenticata */}
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="ideas"   element={<IdeasPage />} />
          <Route path="rules"   element={<RulesPage />} />
          <Route path="vote"    element={<VotePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Admin — protetto */}
          <Route path="admin" element={<AdminGuard />}>
            <Route index          element={<AdminDashboard />} />
            <Route path="ideas"        element={<AdminIdeas />} />
            <Route path="users"        element={<AdminUsers />} />
            <Route path="reports"      element={<AdminReports />} />
            <Route path="rules"        element={<AdminRules />} />
            <Route path="banned-words" element={<AdminBannedWords />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

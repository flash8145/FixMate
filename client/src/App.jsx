import { useEffect, Component } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/layout/NavBar.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import CustomerHome from './pages/CustomerHome.jsx'
import CustomerProfile from './pages/CustomerProfile.jsx'
import MyBookings from './pages/MyBookings.jsx'
import WorkerDashboard from './pages/WorkerDashboard.jsx'
import WorkerProfileSetup from './pages/WorkerProfileSetup.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import AiAssistantWidget from './components/ai/AiAssistantWidget.jsx'
import { useAuthStore } from './store/authStore.js'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('FixMate UI Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-slate-200">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 font-extrabold text-2xl">
              ⚠️
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-xs text-slate-500 mb-6">
              {this.state.error?.message || 'An unexpected UI error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
              className="w-full rounded-2xl bg-orange-600 py-3 text-xs font-bold text-white shadow-md hover:bg-orange-700 transition-colors cursor-pointer"
            >
              Reload FixMate
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function RootRedirect() {
  const user = useAuthStore((s) => s.user)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  if (isBootstrapping) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm font-medium text-slate-400">
        Loading FixMate…
      </div>
    )
  }

  // If user is not logged in, always open the unified login page first
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If user is logged in, automatically direct them to their role-specific dashboard
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  if (user.role === 'worker') return <Navigate to="/worker" replace />
  return <Navigate to="/customer" replace />
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <ErrorBoundary>

      <Routes>
        {/* Entry point: redirects unauthenticated users to /login, and authenticated users to their portal */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public authentication routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Customer Routes */}
        <Route
          path="/customer"
          element={
            <ProtectedRoute allowedRoles={['customer', 'admin']}>
              <CustomerHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/profile"
          element={
            <ProtectedRoute allowedRoles={['customer', 'admin']}>
              <CustomerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute allowedRoles={['customer', 'admin']}>
              <MyBookings />
            </ProtectedRoute>
          }
        />

        {/* Protected Worker Routes */}
        <Route
          path="/worker"
          element={
            <ProtectedRoute allowedRoles={['worker', 'admin']}>
              <WorkerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker/profile"
          element={
            <ProtectedRoute allowedRoles={['worker', 'admin']}>
              <WorkerProfileSetup />
            </ProtectedRoute>
          }
        />

        {/* Protected Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
      {user && <AiAssistantWidget key={user.id || user._id || user.phone} />}
    </div>
  )
}


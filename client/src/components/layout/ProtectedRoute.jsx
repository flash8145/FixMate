import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'

export default function ProtectedRoute({ children, allowedRoles }) {
  const user = useAuthStore((s) => s.user)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  if (isBootstrapping) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm font-medium text-slate-400">
        Loading FixMate…
      </div>
    )
  }

  // Not logged in -> redirect to unified login page
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Logged in, but unauthorized for this specific role -> redirect to their role home
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const defaultHome =
      user.role === 'admin' ? '/admin' : user.role === 'worker' ? '/worker' : '/customer'
    return <Navigate to={defaultHome} replace />
  }

  return children
}

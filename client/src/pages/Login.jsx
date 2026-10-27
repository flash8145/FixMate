import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import { useAuthStore } from '../store/authStore.js'
import { AlertCircle, Lock, User, ArrowRight } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)
  const login = useAuthStore((s) => s.login)
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getRedirectPath = (role) => {
    if (role === 'admin') return '/admin'
    if (role === 'worker') return '/worker'
    return '/customer'
  }

  // If already authenticated, redirect to role-specific dashboard
  useEffect(() => {
    if (!isBootstrapping && user) {
      navigate(getRedirectPath(user.role), { replace: true })
    }
  }, [user, isBootstrapping, navigate])

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.identifier || !form.password) {
      setError('Enter your phone number, registered name, or email, and password.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const loggedInUser = await login(form)
      navigate(getRedirectPath(loggedInUser.role), { replace: true })
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in via 10-digit phone, name, or email to access your account"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Identifier Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Phone, Name, or Email
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. 9819998199, Priya Mehta, or priya@fixmate.in"
              value={form.identifier}
              onChange={update('identifier')}
              autoComplete="username"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={update('password')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 disabled:opacity-60 transition-all cursor-pointer"
        >
          <span>{isSubmitting ? 'Logging in…' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>


      <p className="mt-5 text-center text-xs text-slate-500">
        New to FixMate?{' '}
        <Link to="/register" className="font-bold text-orange-600 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}

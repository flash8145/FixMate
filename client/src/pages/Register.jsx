import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import { useAuthStore } from '../store/authStore.js'
import { AlertCircle, User, Mail, ArrowRight, Briefcase } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)
  const register = useAuthStore((s) => s.register)
  const [form, setForm] = useState({
    role: 'customer',
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
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
    if (!form.name || !form.phone || !form.password) {
      setError('Name, 10-digit phone number, and password are required.')
      return
    }
    if (form.phone.length !== 10) {
      setError('Phone number must be exactly 10 digits.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const newUser = await register(form)
      navigate(newUser.role === 'worker' ? '/worker/profile' : '/customer', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create Your Account"
      subtitle="Join FixMate to find trusted local experts or offer your services"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Role Toggle Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            I want to
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'customer', label: 'Book Services', sub: 'I need local help', icon: User },
              { id: 'worker', label: 'Offer Services', sub: 'I am a technician', icon: Briefcase },
            ].map((r) => {
              const Icon = r.icon
              const isSelected = form.role === r.id
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: r.id }))}
                  className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/70 text-orange-950 ring-2 ring-orange-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100/60'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mb-1 ${
                      isSelected ? 'text-orange-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-xs font-bold">{r.label}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{r.sub}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. Ramesh Sharma"
              value={form.name}
              onChange={update('name')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>
        </div>

        {/* Phone number */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Phone Number (10 Digits)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              +91
            </span>
            <input
              type="tel"
              maxLength={10}
              placeholder="9820098200"
              value={form.phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                setForm((f) => ({ ...f, phone: digits }))
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-12 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Email <span className="font-normal text-slate-400 lowercase">(optional)</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              placeholder="you@fixmate.in"
              value={form.email}
              onChange={update('email')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>
        </div>

        {/* Password & Confirm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={update('password')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
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
          className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 disabled:opacity-60 transition-all cursor-pointer"
        >
          <span>{isSubmitting ? 'Creating account…' : 'Create FixMate Account'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-slate-500">
        Already registered?{' '}
        <Link to="/login" className="font-bold text-orange-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

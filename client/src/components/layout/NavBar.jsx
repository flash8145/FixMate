import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import { useAiStore } from '../../store/aiStore.js'
import {
  Wrench,
  Search,
  Calendar,
  Briefcase,
  Shield,
  LogOut,
  ChevronDown,
  User,
  Sparkles,
} from 'lucide-react'

export default function NavBar() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const handleLogout = () => {
    logout()
    setShowProfileMenu(false)
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-[1500] border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2.5">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 shadow-md shadow-orange-500/25 transition-transform duration-200 group-hover:scale-105">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Fix<span className="text-orange-500">Mate</span>
            </span>
          </NavLink>
        </div>

        {/* Navigation Links for Authenticated Roles */}
        {user && (
          <nav className="hidden sm:flex items-center gap-1 rounded-2xl bg-slate-100/90 p-1 border border-slate-200/60">
            {(user.role === 'customer' || user.role === 'admin') && (
              <NavLink
                to="/customer"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                <Search className="h-3.5 w-3.5" />
                Find Workers
              </NavLink>
            )}

            {user.role === 'customer' && (
              <NavLink
                to="/my-bookings"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                <Calendar className="h-3.5 w-3.5" />
                My Bookings
              </NavLink>
            )}

            {user.role === 'worker' && (
              <NavLink
                to="/worker"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                <Briefcase className="h-3.5 w-3.5" />
                Worker Hub
              </NavLink>
            )}

            {user.role === 'admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                <Shield className="h-3.5 w-3.5" />
                Admin Panel
              </NavLink>
            )}
          </nav>
        )}

        {/* Right Action Items */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              {/* Ask AI Trigger Button */}
              <button
                onClick={() => useAiStore.getState().toggle()}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:from-orange-600 hover:to-amber-600 transition-all cursor-pointer"
                title="Open AI Concierge"
              >
                <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
                <span className="hidden md:inline">Ask AI</span>
              </button>

              {/* User Profile Pill */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu((v) => !v)}
                  className="flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-white/90 py-1 pl-1 pr-3 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-xs font-bold text-white shadow-xs overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                    ) : user.name ? (
                      user.name.slice(0, 2).toUpperCase()
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                      {user.name}
                    </p>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-600">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {/* Profile dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.phone || user.email}</p>
                    </div>

                    {user.role === 'customer' && (
                      <NavLink
                        to="/customer/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User className="h-3.5 w-3.5 text-orange-500" />
                        My Profile & Address
                      </NavLink>
                    )}

                    {user.role === 'worker' && (
                      <NavLink
                        to="/worker/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User className="h-3.5 w-3.5 text-slate-500" />
                        Edit Profile & Rates
                      </NavLink>
                    )}

                    {user.role === 'admin' && (
                      <NavLink
                        to="/admin"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Shield className="h-3.5 w-3.5 text-orange-500" />
                        Admin Dashboard
                      </NavLink>
                    )}

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink
                to="/login"
                className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100/60 transition-colors"
              >
                Log in
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 transition-all duration-200"
              >
                Sign up
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

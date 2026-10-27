import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wrench, ShieldCheck, Star } from 'lucide-react'
import { AUTH_HERO_IMAGE } from '../../config/images.js'
import { pageVariants } from '../../utils/motion.js'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative flex min-h-[calc(100vh-61px)] items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-900 overflow-hidden"
    >
      {/* Background Photography with Depth Gradients */}
      <img
        src={AUTH_HERO_IMAGE}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-20 scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/80 to-slate-900/60 backdrop-blur-xs" />

      {/* Auth Content Container */}
      <div className="relative z-10 w-full max-w-md sm:max-w-lg">
        {/* Brand Header */}
        <div className="mb-6 text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform duration-200">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              Fix<span className="text-orange-500">Mate</span>
            </span>
          </Link>

          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Glass Card Surface */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/90 shadow-2xl bg-white/95">
          {children}
        </div>

        {/* Trust Badges Footer */}
        <div className="mt-6 flex items-center justify-center gap-6 text-[11px] font-semibold text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Verified Workers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>Community Rated</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

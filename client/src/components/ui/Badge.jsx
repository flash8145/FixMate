import { STATUS_CONFIG } from '../../constants/status.js'

export default function Badge({ status, variant = 'status', children, className = '' }) {
  if (variant === 'status' && status) {
    const config = STATUS_CONFIG[status] || {
      label: status,
      dot: 'bg-slate-400',
      bg: 'bg-slate-100',
      border: 'border-slate-200',
      text: 'text-slate-700',
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${config.bg} ${config.border} ${config.text} ${className}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
        {children || config.label}
      </span>
    )
  }

  if (variant === 'verified') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700 ${className}`}
      >
        <svg className="w-3 h-3 text-emerald-600 fill-current" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Verified
      </span>
    )
  }

  if (variant === 'available') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Available now
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700 ${className}`}
    >
      {children}
    </span>
  )
}

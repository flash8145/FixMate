export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  type = 'button',
  onClick,
  ...props
}) {
  const base =
    'relative inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer'

  const sizes = {
    xs: 'px-2.5 py-1 text-xs rounded-lg gap-1.5',
    sm: 'px-3.5 py-1.5 text-xs rounded-xl gap-2',
    md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3.5 text-base rounded-2xl gap-2.5 font-bold',
  }

  const variants = {
    primary:
      'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 hover:shadow-lg hover:shadow-orange-500/30',
    secondary:
      'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/80',
    outline:
      'border border-slate-300/90 text-slate-700 bg-white/80 hover:bg-white hover:border-orange-400 hover:text-orange-600 shadow-xs',
    glass:
      'bg-white/80 backdrop-blur-md border border-white/60 text-slate-800 hover:bg-white/95 shadow-sm hover:shadow',
    ghost:
      'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80',
    danger:
      'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  )
}

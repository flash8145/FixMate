export default function GlassPanel({
  children,
  className = '',
  elevation = 'md',
  rounded = '2xl',
  border = true,
  onClick,
  as: Component = 'div',
  ...props
}) {
  const roundedClasses = {
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full',
  }

  const elevationClasses = {
    none: '',
    sm: 'shadow-xs',
    md: 'shadow-md shadow-slate-900/5',
    lg: 'shadow-xl shadow-slate-900/10',
    xl: 'shadow-2xl shadow-slate-900/15',
  }

  return (
    <Component
      onClick={onClick}
      className={`glass-panel ${roundedClasses[rounded] || 'rounded-2xl'} ${
        elevationClasses[elevation]
      } ${border ? 'border border-white/80' : ''} ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}

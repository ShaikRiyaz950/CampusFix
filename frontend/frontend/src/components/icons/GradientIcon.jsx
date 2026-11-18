function GradientIcon({ icon: Icon, size = 20, className = '', tone = 'coral', label }) {
  return (
    <span className={`gradient-icon gradient-icon-${tone} ${className}`} role={label ? 'img' : undefined} aria-label={label}>
      {Icon && <Icon size={size} strokeWidth={1.9} aria-hidden={label ? undefined : true} />}
    </span>
  )
}

export default GradientIcon

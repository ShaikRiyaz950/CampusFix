function IconButton({
  icon: Icon,
  label,
  className = '',
  size = 18,
  onClick,
  type = 'button',
  pressed,
}) {
  return (
    <button
      type={type}
      className={`icon-button ${className}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
    >
      {Icon && <Icon size={size} strokeWidth={1.9} aria-hidden="true" />}
    </button>
  )
}

export default IconButton

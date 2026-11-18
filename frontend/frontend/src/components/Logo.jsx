function Logo({ compact = false }) {
  return (
    <span className="brand" aria-label="CampusFix">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" role="img">
          <path d="M16 3 4 9.5 16 16l12-6.5L16 3Z" />
          <path d="M7.5 12.5v8L16 25l8.5-4.5v-8L16 17l-8.5-4.5Z" />
        </svg>
      </span>
      {!compact && (
        <span className="brand-copy">
          Campus<span>Fix</span>
        </span>
      )}
    </span>
  )
}

export default Logo

import { useEffect, useRef, useState } from 'react'

import GradientIcon from './icons/GradientIcon'

function StatCard({ label, value, icon: Icon, tone }) {
  const [count, setCount] = useState(0)
  const cardRef = useRef(null)

  useEffect(() => {
    let current = 0
    const timer = window.setInterval(() => {
      current += 1
      setCount(Math.min(current, value))
      if (current >= value) window.clearInterval(timer)
    }, 35)
    return () => window.clearInterval(timer)
  }, [value])

  const tiltCard = (event) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    cardRef.current.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${y * -7}deg) translateY(-5px)`
  }

  const resetTilt = () => {
    if (cardRef.current) cardRef.current.style.transform = ''
  }

  return (
    <article
      ref={cardRef}
      className={`stat-card stat-card-${tone}`}
      onMouseMove={tiltCard}
      onMouseLeave={resetTilt}
    >
      <GradientIcon icon={Icon} size={24} className="stat-card-icon" tone={tone} />
      <div className="stat-card-copy">
        <strong>{count}</strong>
        <span>{label}</span>
      </div>
      <div className="stat-card-glow" />
    </article>
  )
}

export default StatCard

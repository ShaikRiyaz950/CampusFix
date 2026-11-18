import { motion, useReducedMotion } from 'framer-motion'

export const revealVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  className = '',
  once = true,
}) {
  const reduceMotion = useReducedMotion()
  const offsets = {
    up: { x: 0, y: 28 },
    left: { x: -28, y: 0 },
    right: { x: 28, y: 0 },
  }
  const offset = offsets[direction] || offsets.up

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, x: offset.x, y: offset.y }}
      whileInView={reduceMotion ? undefined : { opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount: 0.16 }}
      transition={{ duration: 0.58, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default ScrollReveal

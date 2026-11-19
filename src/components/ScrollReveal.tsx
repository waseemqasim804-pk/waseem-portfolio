// src/components/ScrollReveal.tsx
// Wraps children in a fade-up-on-scroll animation via Framer Motion
import { motion, type MotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

interface ScrollRevealProps extends MotionProps {
  children: ReactNode
  delay?: number
  className?: string
}

export default function ScrollReveal({ children, delay = 0, className = '', ...rest }: ScrollRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}


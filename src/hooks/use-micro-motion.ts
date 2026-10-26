import { useReducedMotion } from 'motion/react'

export function useMicroMotion(disabled = false) {
  const reduced = useReducedMotion()
  const enabled = !reduced && !disabled
  return {
    'data-micro-motion': '',
    whileHover: enabled ? { y: -2, scale: 1.025 } : undefined,
    whileTap: enabled ? { y: 0, scale: 0.97 } : undefined,
    transition: { type: 'spring' as const, stiffness: 480, damping: 30, mass: 0.55 },
  }
}

import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import type { GoalStatus, GoalType } from '../types/database'

export function progressionEvent(previous: { status: GoalStatus; locked: number }, current: { status: GoalStatus; locked: number }) {
  if (previous.status !== 'completed' && current.status === 'completed') return 'completed'
  if (previous.locked > 0 && current.locked === 0 && ['planned', 'active'].includes(current.status)) return 'available'
  return null
}

// A mounted surface reacts only to a persisted change. Initial render/filtering/
// refresh establishes a baseline and never replays a completion celebration.
export function useProgressionAnimation<T extends HTMLElement = HTMLElement>(status: GoalStatus, locked: number, type: GoalType) {
  const ref = useRef<T>(null)
  const previous = useRef({ status, locked })
  const reduced = useReducedMotion()
  useEffect(() => {
    const event = progressionEvent(previous.current, { status, locked })
    previous.current = { status, locked }
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!event || reduced || preference.matches || !ref.current?.animate) return
    const animation = ref.current.animate([
      { boxShadow: '0 0 0 0 transparent' },
      { boxShadow: `0 0 0 ${event === 'completed' && type === 'milestone' ? 6 : 3}px var(--ring)`, offset: 0.3 },
      { boxShadow: '0 0 0 0 transparent' },
    ], { duration: event === 'completed' ? 750 : 600, easing: 'ease-out' })
    const stopIfReduced = () => { if (preference.matches) animation.cancel() }
    preference.addEventListener('change', stopIfReduced)
    const detach = () => preference.removeEventListener('change', stopIfReduced)
    void animation.finished.then(detach, detach)
    return () => { detach(); animation.cancel() }
  }, [status, locked, type, reduced])
  return ref
}

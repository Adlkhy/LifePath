import { useState, type ComponentProps } from 'react'
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import { Link, NavLink } from 'react-router-dom'
import { useMicroMotion } from '../../hooks/use-micro-motion'
import { cn } from '../../lib/utils'

const RouterLink = motion.create(Link)
const RouterNavLink = motion.create(NavLink)

export function MotionLink(props: ComponentProps<typeof RouterLink>) {
  const interaction = useMicroMotion()
  return <RouterLink {...interaction} {...props} />
}

export function MotionNavLink(props: ComponentProps<typeof RouterNavLink>) {
  const interaction = useMicroMotion()
  return <RouterNavLink {...interaction} {...props} />
}

export function MotionAnchor(props: HTMLMotionProps<'a'>) {
  const interaction = useMicroMotion()
  return <motion.a {...interaction} {...props} />
}

// Cards keep their article/list semantics; only their actual links and buttons are tabbable.
export function MotionCard({ as = 'article', className, children, ...props }: Omit<HTMLMotionProps<'article'>, 'ref'> & { as?: 'article' | 'li' }) {
  const reduced = useReducedMotion()
  const [focused, setFocused] = useState(false)
  const Card = as === 'li' ? motion.li : motion.article
  return <Card {...props} className={cn('motion-card', className)} data-micro-motion=""
    initial={false}
    animate={{ y: !reduced && focused ? -4 : 0 }}
    whileHover={reduced ? undefined : { y: -5 }}
    transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.7 }}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}
  >{children}</Card>
}

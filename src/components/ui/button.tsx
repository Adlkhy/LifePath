import { Button as ButtonPrimitive } from '@base-ui/react/button'
import type { ComponentProps } from 'react'
import { motion } from 'motion/react'
import { useMicroMotion } from '../../hooks/use-micro-motion'
import { cn } from '../../lib/utils'

const MotionButton = motion.create(ButtonPrimitive)
type Props = Omit<ComponentProps<typeof MotionButton>, 'className'> & { className?: string; variant?: 'default' | 'outline' | 'destructive' }

export function Button({ className, variant = 'default', type = 'button', render, nativeButton = !render, ...props }: Props) {
  const interaction = useMicroMotion(Boolean(props.disabled || props['aria-disabled'] === true || props['aria-disabled'] === 'true'))
  return <MotionButton {...interaction} type={type} render={render} nativeButton={nativeButton} data-slot="button" className={cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-xs font-bold tracking-[.03em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
    variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/85',
    variant === 'outline' && 'bg-background text-foreground hover:bg-secondary hover:text-secondary-foreground',
    variant === 'destructive' && 'bg-background text-destructive hover:bg-muted',
    className,
  )} {...props} />
}

import { Button as ButtonPrimitive } from '@base-ui/react/button'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

type Props = Omit<ComponentProps<typeof ButtonPrimitive>, 'className'> & { className?: string; variant?: 'default' | 'outline' | 'destructive' }

export function Button({ className, variant = 'default', type = 'button', render, nativeButton = !render, ...props }: Props) {
  return <ButtonPrimitive type={type} render={render} nativeButton={nativeButton} data-slot="button" className={cn(
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
    variant === 'default' && 'bg-primary text-primary-foreground',
    variant === 'outline' && 'border border-input bg-background text-foreground hover:bg-accent',
    variant === 'destructive' && 'bg-destructive text-destructive-foreground',
    className,
  )} {...props} />
}

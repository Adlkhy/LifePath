import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/utils'

const control = 'min-h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input data-slot="input" className={cn(control, className)} {...props} />
}
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(control, 'min-h-24', className)} {...props} />
}
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select data-slot="native-select" className={cn(control, className)} {...props} />
}
export function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="min-w-0 space-y-2"><label className="block text-sm font-medium" htmlFor={id}>{label}</label>{children}</div>
}

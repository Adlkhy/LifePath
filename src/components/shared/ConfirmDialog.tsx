import { Dialog } from '@base-ui/react/dialog'
import type { ReactNode } from 'react'
import { Button } from '../ui/button'

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, busy = false, confirmDisabled = false, onConfirm, children }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string
  confirmLabel: string; busy?: boolean; confirmDisabled?: boolean; onConfirm: () => void; children?: ReactNode
}) {
  return <Dialog.Root open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value) }}>
    <Dialog.Portal><Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/30" /><Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 space-y-4 overflow-y-auto rounded-lg border bg-popover p-6 text-popover-foreground shadow-lg">
      <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title><Dialog.Description className="text-sm text-muted-foreground">{description}</Dialog.Description>
      {children}<div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" disabled={busy || confirmDisabled} onClick={onConfirm}>{busy ? 'Working…' : confirmLabel}</Button></div>
    </Dialog.Popup></Dialog.Portal>
  </Dialog.Root>
}

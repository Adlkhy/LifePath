import { useState } from 'react'
import { useMutation } from '../../hooks/use-mutation'
import { accountService } from '../../services/account.service'
import { Button } from '../ui/button'
import { Field, Input } from '../ui/form-controls'
import { ConfirmDialog } from '../shared/ConfirmDialog'
export function AccountDeletion() {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const mutation = useMutation()
  const enabled = import.meta.env.VITE_ENABLE_ACCOUNT_DELETION === 'true'
  return <section className="space-y-3 rounded-lg border p-4"><h2 className="text-xl font-semibold">Delete account</h2><p className="text-sm text-muted-foreground">Permanently remove your account, goals, chapters, memories, history, and photos. Export your data and back up photos first.</p>{enabled ? <Button variant="destructive" onClick={() => { setConfirmation(''); setOpen(true) }}>Delete my account</Button> : <p className="text-sm">Account deletion is not enabled in this installation.</p>}
    <ConfirmDialog open={open} onOpenChange={setOpen} title="Permanently delete your account?" description="This cannot be undone. Photos are removed first; if deletion fails, some photos may already have been removed. Keep your backups and retry to finish." confirmLabel="Permanently delete account" busy={mutation.busy} confirmDisabled={confirmation !== 'DELETE'} onConfirm={() => void mutation.run(accountService.remove, 'Account deleted.')}><Field id="delete-confirmation" label="Type DELETE to confirm"><Input id="delete-confirmation" autoComplete="off" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></Field>{mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}</ConfirmDialog>
  </section>
}

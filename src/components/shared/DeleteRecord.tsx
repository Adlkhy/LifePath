import { useState } from 'react'
import { Button } from '../ui/button'
import { ConfirmDialog } from './ConfirmDialog'

export function DeleteRecord({ name, explanation, busy, onDelete, error }: { name: string; explanation: string; busy: boolean; onDelete: () => void; error?: string | null }) {
  const [confirm, setConfirm] = useState(false)
  return <><Button variant="outline" disabled={busy} onClick={() => setConfirm(true)}>Delete {name}</Button><ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Delete ${name}?`} description={`This cannot be undone. ${explanation}`} confirmLabel={`Yes, delete ${name}`} busy={busy} onConfirm={onDelete}>{error && <p role="alert" className="text-destructive">{error}</p>}</ConfirmDialog></>
}

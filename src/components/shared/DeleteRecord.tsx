import { useState } from 'react'
import { Button } from '../ui/button'

export function DeleteRecord({ name, explanation, busy, onDelete }: { name: string; explanation: string; busy: boolean; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false)
  if (!confirm) return <Button variant="outline" disabled={busy} onClick={() => setConfirm(true)}>Delete {name}</Button>
  return <div role="group" aria-label={`Confirm ${name} deletion`} className="space-y-3 rounded-lg border p-4">
    <p>Delete this {name}? This cannot be undone. {explanation}</p>
    <div className="flex flex-wrap gap-2"><Button variant="destructive" disabled={busy} onClick={onDelete}>{busy ? 'Deleting…' : `Yes, delete ${name}`}</Button><Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>Cancel</Button></div>
  </div>
}

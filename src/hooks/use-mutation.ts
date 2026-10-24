import { useRef, useState } from 'react'
import { errorMessage } from '../lib/data-error'
import { useFeedback } from '../state/feedback-context'

export function useMutation() {
  const notify = useFeedback()
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function run(action: () => Promise<unknown>, successMessage: string | false = 'Changes saved.'): Promise<boolean> {
    if (pending.current) return false
    pending.current = true
    setBusy(true)
    setError(null)
    try { await action(); if (successMessage) notify(successMessage); return true }
    catch (cause) { setError(errorMessage(cause)); return false }
    finally { pending.current = false; setBusy(false) }
  }
  return { busy, error, run }
}

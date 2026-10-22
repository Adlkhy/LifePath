import { useRef, useState } from 'react'
import { errorMessage } from '../lib/data-error'

export function useMutation() {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function run(action: () => Promise<unknown>): Promise<boolean> {
    if (pending.current) return false
    pending.current = true
    setBusy(true)
    setError(null)
    try { await action(); return true }
    catch (cause) { setError(errorMessage(cause)); return false }
    finally { pending.current = false; setBusy(false) }
  }
  return { busy, error, run }
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import { authService } from '../services/auth.service'
import { errorMessage } from '../lib/data-error'

export function AccountPage() {
  const { session } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signOut() {
    setBusy(true)
    setError(null)
    try { await authService.signOut() }
    catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }

  return (
    <section className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Your account</h1>
      <p>Signed in as {session?.user.email}.</p>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <button onClick={signOut} disabled={busy} className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{busy ? 'Signing out…' : 'Sign out'}</button>
      <p><Link to="/" className="underline">Back home</Link></p>
    </section>
  )
}

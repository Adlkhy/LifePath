import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import { authService } from '../../services/auth.service'
import { errorMessage } from '../../lib/data-error'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const { session, loading, error: sessionError } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const signingUp = mode === 'sign-up'
  const from: unknown = location.state?.from
  const destination = typeof from === 'string' && (from === '/app' || from.startsWith('/app/') || from.startsWith('/app?')) ? from : '/app'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      if (signingUp) {
        const data = await authService.signUp(email.trim(), password)
        if (!data.session) setMessage('Check your email to confirm your account, then sign in. Open the confirmation link in this browser.')
      } else {
        await authService.signIn(email.trim(), password)
      }
      setPassword('')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p role="status" className="p-6">Restoring your session…</p>
  if (session) return <Navigate to={destination} replace />

  return (
    <main className="mx-auto max-w-sm space-y-6 p-6">
      <h1 className="text-2xl font-semibold">{signingUp ? 'Create your Lifepath account' : 'Sign in to Lifepath'}</h1>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="block">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} className="w-full rounded-md border border-input bg-background px-3 py-2 focus-visible:outline-2 focus-visible:outline-ring" />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block">Password</label>
          <input id="password" type="password" autoComplete={signingUp ? 'new-password' : 'current-password'} minLength={signingUp ? 8 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} className="w-full rounded-md border border-input bg-background px-3 py-2 focus-visible:outline-2 focus-visible:outline-ring" />
          {signingUp && <p className="text-sm text-muted-foreground">Use at least 8 characters.</p>}
        </div>
        {(error || sessionError) && <p role="alert" className="text-destructive">{error || sessionError}</p>}
        {message && <p role="status">{message}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{busy ? 'Please wait…' : signingUp ? 'Create account' : 'Sign in'}</button>
      </form>
      <p><Link className="underline" to={signingUp ? '/sign-in' : '/sign-up'} state={location.state}>{signingUp ? 'Already have an account? Sign in' : 'Create an account'}</Link></p>
      <Link className="underline" to="/">Back home</Link>
    </main>
  )
}

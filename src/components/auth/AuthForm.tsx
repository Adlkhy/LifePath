import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import { authService } from '../../services/auth.service'
import { errorMessage } from '../../lib/data-error'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { BlueRibbon, BrandMark, Sticker } from '../shared/Brand'
import { Button } from '../ui/button'
import { Input } from '../ui/form-controls'

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
    <main className="public-theme auth-page">
      <Link to="/" className="brand-link" aria-label="Lifepath home"><BrandMark /><span>lifepath</span></Link>
      <div className="auth-layout">
      <div className="auth-poster"><BlueRibbon className="auth-ribbon" /><Sticker kind={signingUp ? 'star' : 'arrow'} /><h1 className="display-type">{signingUp ? <>A FRESH<br />CHAPTER.</> : <>HELLO,<br />YOU.</>}</h1><p>{signingUp ? 'Every good story starts somewhere. Let’s make this one yours.' : 'Your dreams, plans, and little wins. All right where you left them.'}</p></div>
      <section className="auth-card space-y-6" aria-labelledby="auth-heading">
      <h2 id="auth-heading">{signingUp ? 'Start your Lifepath' : 'Welcome back.'}</h2>
      <p>{signingUp ? 'A little direction for your next adventure.' : 'Sign in and pick up your next chapter.'}</p>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="block">Email</label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block">Password</label>
          <Input id="password" type="password" autoComplete={signingUp ? 'new-password' : 'current-password'} minLength={signingUp ? 8 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
          {signingUp && <p className="text-sm text-muted-foreground">Use at least 8 characters.</p>}
        </div>
        {(error || sessionError) && <p role="alert" className="text-destructive">{error || sessionError}</p>}
        {message && <p role="status">{message}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Please wait…' : signingUp ? 'Create account' : 'Sign in'}<ArrowUpRight size={18} aria-hidden="true" /></Button>
      </form>
      <p><Link className="underline" to={signingUp ? '/sign-in' : '/sign-up'} state={location.state}>{signingUp ? 'Already have an account? Sign in' : 'Create an account'}</Link></p>
      </section>
      </div>
      <Link className="auth-back underline" to="/"><ArrowLeft size={16} />Back home</Link>
    </main>
  )
}

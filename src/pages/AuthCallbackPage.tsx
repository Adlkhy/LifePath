import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'

export function AuthCallbackPage() {
  const { loading, session, error } = useAuth()
  const [params] = useSearchParams()
  if (loading) return <p role="status" className="p-6">Confirming your account…</p>
  if (session) return <Navigate to="/app" replace />
  return <main className="space-y-4 p-6"><p role="alert">{error || params.get('error_description') || 'Confirmation could not restore a session. Try signing in, or request a new confirmation email by signing up again.'}</p><Link to="/sign-in" className="underline">Sign in</Link></main>
}

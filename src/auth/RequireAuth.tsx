import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'

export function RequireAuth() {
  const { session, loading, error } = useAuth()
  const location = useLocation()
  if (loading) return <p role="status" className="p-6">Restoring your session…</p>
  if (error) return <div className="p-6"><p role="alert">{error}</p><a className="underline" href="/sign-in">Try signing in again</a></div>
  if (!session) return <Navigate to="/sign-in" state={{ from: location.pathname + location.search }} replace />
  return <Outlet />
}

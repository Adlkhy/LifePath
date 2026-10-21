import { useEffect, useState, type ReactNode } from 'react'
import { authService } from '../services/auth.service'
import { errorMessage } from '../lib/data-error'
import { AuthContext, type AuthState } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true, error: null })

  useEffect(() => {
    let active = true
    let receivedAuthEvent = false
    const unsubscribe = authService.subscribe((session) => {
      receivedAuthEvent = true
      if (active) setState({ session, loading: false, error: null })
    })
    void authService.getSession().then((session) => {
      // An older restoration response must never overwrite a newer auth event.
      if (active && !receivedAuthEvent) setState({ session, loading: false, error: null })
    }).catch((error: unknown) => {
      if (active) setState((current) => ({ ...current, loading: false, error: errorMessage(error) }))
    })
    return () => { active = false; unsubscribe() }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

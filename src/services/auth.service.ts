import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { DataError } from '../lib/data-error'

export type AuthSession = Session

export const authService = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw new DataError('Sign up', error)
    return data
  },
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new DataError('Sign in', error)
    return data
  },
  async signOut() {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw new DataError('Sign out', error)
  },
  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw new DataError('Restore session', error)
    return data.session
  },
  subscribe(callback: (session: Session | null) => void) {
    // Keep this callback synchronous; awaiting another Auth operation can deadlock.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
    return () => data.subscription.unsubscribe()
  },
}

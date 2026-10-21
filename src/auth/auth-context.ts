import { createContext } from 'react'
import type { AuthSession } from '../services/auth.service'

export type AuthState = { session: AuthSession | null; loading: boolean; error: string | null }
export const AuthContext = createContext<AuthState | undefined>(undefined)

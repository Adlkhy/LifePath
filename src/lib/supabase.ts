import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

if (!url || !key || url.includes('YOUR_PROJECT_REF') || key.includes('YOUR_PUBLIC_KEY')) {
  throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart Vite.')
}

if (!key.startsWith('sb_publishable_')) {
  throw new Error('Use a Supabase sb_publishable_ public key in VITE_SUPABASE_PUBLISHABLE_KEY. Never use a secret or service-role key in the browser.')
}

const parsedUrl = new URL(url)
if (parsedUrl.protocol !== 'https:' && !(parsedUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsedUrl.hostname))) {
  throw new Error('VITE_SUPABASE_URL must use HTTPS (HTTP is allowed only for local development).')
}

// One shared browser client. RLS, not the cached browser session, authorizes data access.
export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

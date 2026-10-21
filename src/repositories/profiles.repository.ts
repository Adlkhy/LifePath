import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/data-error'
import type { Profile } from '../types/database'

export const profilesRepository = {
  async get() {
    return unwrap('Get profile', await supabase.from('profiles').select('*').single())
  },
  async update(id: string, input: Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'preferences'>>) {
    return unwrap('Update profile', await supabase.from('profiles').update(input).eq('id', id).select().single())
  },
}

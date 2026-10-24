import { supabase } from '../lib/supabase'
import { DataError } from '../lib/data-error'
export const accountService = {
  async remove() {
    const { data, error } = await supabase.functions.invoke('delete-account', { body: { confirmation: 'DELETE' } })
    if (error || !data?.deleted) throw new DataError('Delete account', error ?? { message: 'Deletion was not confirmed. Try again.' })
    await supabase.auth.signOut({ scope: 'local' })
  },
}

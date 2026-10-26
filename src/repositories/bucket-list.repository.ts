import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/data-error'
import { collectPages } from '../lib/pagination'

export const bucketListRepository = {
  listAll() {
    return collectPages(async (offset) => unwrap('Load bucket list', await supabase.from('bucket_list_items').select('*').order('created_at', { ascending: false }).order('goal_id').range(offset, offset + 99)))
  },
  async add(goalId: string) {
    return unwrap('Add experience', await supabase.from('bucket_list_items').insert({ goal_id: goalId }).select().single())
  },
  async create(input: { title: string; description: string | null; category: string | null; target_date: string | null }) {
    return unwrap('Create experience', await supabase.rpc('create_bucket_experience', {
      experience_title: input.title, experience_description: input.description, experience_category: input.category, experience_date: input.target_date,
    }))
  },
  async remove(goalId: string) {
    return unwrap('Remove experience', await supabase.from('bucket_list_items').delete().eq('goal_id', goalId).select('goal_id').single())
  },
}

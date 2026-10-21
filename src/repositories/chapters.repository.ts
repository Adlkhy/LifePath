import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/data-error'
import type { Database } from '../types/database'

type Insert = Database['public']['Tables']['chapters']['Insert']
export type CreateChapter = Omit<Insert, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type UpdateChapter = Partial<CreateChapter>

export const chaptersRepository = {
  async list() {
    return unwrap('List chapters', await supabase.from('chapters').select('*').order('sort_order').order('id'))
  },
  async get(id: string) {
    return unwrap('Get chapter', await supabase.from('chapters').select('*').eq('id', id).single())
  },
  async create(input: CreateChapter) {
    return unwrap('Create chapter', await supabase.from('chapters').insert(input).select().single())
  },
  async update(id: string, input: UpdateChapter) {
    return unwrap('Update chapter', await supabase.from('chapters').update(input).eq('id', id).select().single())
  },
  async remove(id: string) {
    return unwrap('Delete chapter', await supabase.from('chapters').delete().eq('id', id).select('id').single())
  },
}

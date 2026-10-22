import { supabase } from '../lib/supabase'
import { DataError, unwrap } from '../lib/data-error'
import { collectPages } from '../lib/pagination'
import type { Database } from '../types/database'

type Insert = Database['public']['Tables']['chapters']['Insert']
export type CreateChapter = Omit<Insert, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type UpdateChapter = Partial<CreateChapter>

export const chaptersRepository = {
  async list(offset = 0) {
    return unwrap('List chapters', await supabase.from('chapters').select('*').order('sort_order').order('id').range(offset, offset + 99))
  },
  listAll() {
    return collectPages((offset) => chaptersRepository.list(offset))
  },
  async reorder(ids: string[]) {
    const { error } = await supabase.rpc('reorder_chapters', { ordered_ids: ids })
    if (error) throw new DataError('Reorder chapters', error)
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

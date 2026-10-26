import { supabase } from '../lib/supabase'
import { unwrap, DataError } from '../lib/data-error'
import { collectPages } from '../lib/pagination'
import type { PersonalValue } from '../types/database'

export type ValueInput = Pick<PersonalValue, 'name' | 'description' | 'guiding_principle'> & { goal_ids: string[] }
export const valuesRepository = {
  listAll() {
    return collectPages(async (offset) => unwrap('Load values', await supabase.from('personal_values').select('*').order('sort_order').order('id').range(offset, offset + 99)))
  },
  listLinks() {
    return collectPages(async (offset) => unwrap('Load value links', await supabase.from('value_goals').select('*').order('value_id').order('goal_id').range(offset, offset + 99)))
  },
  async save(id: string | null, input: ValueInput) {
    return unwrap('Save value', await supabase.rpc('save_personal_value', { value_id: id, value_name: input.name, value_description: input.description, principle: input.guiding_principle, goal_ids: input.goal_ids }))
  },
  async reorder(ids: string[]) {
    const { error } = await supabase.rpc('reorder_values', { ordered_ids: ids })
    if (error) throw new DataError('Reorder values', error)
  },
  async remove(id: string) {
    return unwrap('Delete value', await supabase.from('personal_values').delete().eq('id', id).select('id').single())
  },
}

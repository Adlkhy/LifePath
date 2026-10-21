import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/data-error'
import type { Database, GoalStatus, GoalType } from '../types/database'

type Insert = Database['public']['Tables']['goals']['Insert']
export type CreateGoal = Omit<Insert, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at'>
export type UpdateGoal = Partial<CreateGoal>

export const goalsRepository = {
  async list(filters: { chapterId?: string; status?: GoalStatus; type?: GoalType; offset?: number; limit?: number } = {}) {
    let query = supabase.from('goals').select('*').order('created_at', { ascending: false }).order('id')
    if (filters.chapterId) query = query.eq('chapter_id', filters.chapterId)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.type) query = query.eq('type', filters.type)
    const offset = Math.max(0, filters.offset ?? 0)
    const limit = Math.min(100, Math.max(1, filters.limit ?? 50))
    return unwrap('List goals', await query.range(offset, offset + limit - 1))
  },
  async get(id: string) {
    return unwrap('Get goal', await supabase.from('goals').select('*').eq('id', id).single())
  },
  async create(input: CreateGoal) {
    return unwrap('Create goal', await supabase.from('goals').insert(input).select().single())
  },
  async update(id: string, input: UpdateGoal) {
    return unwrap('Update goal', await supabase.from('goals').update(input).eq('id', id).select().single())
  },
  async remove(id: string) {
    return unwrap('Delete goal', await supabase.from('goals').delete().eq('id', id).select('id').single())
  },
}

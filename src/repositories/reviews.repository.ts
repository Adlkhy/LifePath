import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/data-error'
import { collectPages } from '../lib/pagination'
import type { GoalReview } from '../types/database'

export type ReviewInput = Pick<GoalReview, 'period_type' | 'period_start' | 'went_well' | 'didnt_go_as_planned' | 'next_focus'>
export const reviewsRepository = {
  listAll() {
    return collectPages(async (offset) => unwrap('Load reviews', await supabase.from('goal_reviews').select('*').order('period_start', { ascending: false }).order('id').range(offset, offset + 99)))
  },
  async save(id: string | null, input: ReviewInput) {
    return unwrap('Save review', await (id ? supabase.from('goal_reviews').update(input).eq('id', id) : supabase.from('goal_reviews').insert(input)).select().single())
  },
}

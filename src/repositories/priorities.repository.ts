import { supabase } from '../lib/supabase'
import { unwrap, DataError } from '../lib/data-error'
import { collectPages } from '../lib/pagination'

export const prioritiesRepository = {
  async forDay(day: string) {
    return unwrap('Load daily priorities', await supabase.from('daily_priorities').select('*').eq('priority_date', day).order('slot'))
  },
  forPeriod(start: string, end: string) {
    return collectPages(async (offset) => unwrap('Load priorities', await supabase.from('daily_priorities').select('*').gte('priority_date', start).lt('priority_date', end).order('priority_date').order('slot').range(offset, offset + 99)))
  },
  async save(day: string, goalIds: string[]) {
    const { error } = await supabase.rpc('set_daily_priorities', { day, goal_ids: goalIds })
    if (error) throw new DataError('Save daily priorities', error)
  },
}

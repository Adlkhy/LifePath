import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/data-error'
import type { Json } from '../types/database'
import { collectPages } from '../lib/pagination'

// Reserved status events can only be emitted by database triggers.
export type CreateProgressEvent = {
  event_type: `custom.${string}`
  goal_id?: string
  chapter_id?: string
  metadata?: { [key: string]: Json }
}

export const progressRepository = {
  listAll() { return collectPages((offset) => progressRepository.list({ offset, limit: 100 })) },
  async list(options: { goalId?: string; chapterId?: string; offset?: number; limit?: number; ascending?: boolean } = {}) {
    let query = supabase.from('progress_events').select('*').order('created_at', { ascending: options.ascending ?? false }).order('id')
    if (options.goalId) query = query.eq('goal_id', options.goalId)
    if (options.chapterId) query = query.eq('chapter_id', options.chapterId)
    const offset = Math.max(0, options.offset ?? 0)
    const limit = Math.min(100, Math.max(1, options.limit ?? 50))
    return unwrap('List progress', await query.range(offset, offset + limit - 1))
  },
  async get(id: string) {
    return unwrap('Get progress event', await supabase.from('progress_events').select('*').eq('id', id).single())
  },
  async append(input: CreateProgressEvent) {
    return unwrap('Record progress', await supabase.from('progress_events').insert(input).select().single())
  },
}

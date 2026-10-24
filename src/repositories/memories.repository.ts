import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/data-error'
import { collectPages } from '../lib/pagination'
import type { Memory } from '../types/database'

export type MemoryInput = Pick<Memory, 'title' | 'description' | 'kind' | 'memory_date' | 'goal_id' | 'chapter_id' | 'event_id' | 'photo_path'>
export const memoriesRepository = {
  listAll() { return collectPages((offset) => memoriesRepository.list(offset)) },
  async list(offset = 0) { return unwrap('Load memories', await supabase.from('memories').select('*').order('memory_date', { ascending: false }).order('id').range(offset, offset + 99)) },
  async get(id: string) { return unwrap('Load memory', await supabase.from('memories').select('*').eq('id', id).single()) },
  async create(input: MemoryInput) { return unwrap('Create memory', await supabase.from('memories').insert(input).select().single()) },
  async update(id: string, input: MemoryInput) { return unwrap('Update memory', await supabase.from('memories').update(input).eq('id', id).select().single()) },
  async remove(id: string) { return unwrap('Delete memory', await supabase.from('memories').delete().eq('id', id).select('id').single()) },
}

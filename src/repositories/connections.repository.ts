import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/data-error'
import { collectPages } from '../lib/pagination'
import type { ConnectionType } from '../types/database'

export type CreateConnection = { source_goal_id: string; target_goal_id: string; connection_type?: ConnectionType }

export const connectionsRepository = {
  async list(offset = 0) {
    return unwrap('List connections', await supabase.from('goal_connections').select('*').order('created_at').order('id').range(offset, offset + 99))
  },
  listAll() {
    return collectPages((offset) => connectionsRepository.list(offset))
  },
  async get(id: string) {
    return unwrap('Get connection', await supabase.from('goal_connections').select('*').eq('id', id).single())
  },
  async create(input: CreateConnection) {
    return unwrap('Create connection', await supabase.from('goal_connections').insert(input).select().single())
  },
  async update(id: string, input: Partial<CreateConnection>) {
    return unwrap('Update connection', await supabase.from('goal_connections').update(input).eq('id', id).select().single())
  },
  async remove(id: string) {
    return unwrap('Delete connection', await supabase.from('goal_connections').delete().eq('id', id).select('id').single())
  },
}

import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/data-error'
import { collectPages } from '../lib/pagination'
import type { Skill } from '../types/database'

export type SkillInput = Pick<Skill, 'name' | 'category' | 'parent_id' | 'level' | 'notes'> & { goal_ids: string[] }
export const skillsRepository = {
  listAll() {
    return collectPages(async (offset) => unwrap('Load skills', await supabase.from('skills').select('*').order('name').order('id').range(offset, offset + 99)))
  },
  listLinks(goalId?: string) {
    return collectPages(async (offset) => {
      let query = supabase.from('skill_goals').select('*').order('skill_id').order('goal_id')
      if (goalId) query = query.eq('goal_id', goalId)
      return unwrap('Load skill links', await query.range(offset, offset + 99))
    })
  },
  async save(id: string | null, input: SkillInput) {
    return unwrap('Save skill', await supabase.rpc('save_skill', { skill_id: id, skill_name: input.name, skill_category: input.category, parent_skill_id: input.parent_id, proficiency: input.level, skill_notes: input.notes, goal_ids: input.goal_ids }))
  },
  async link(skillId: string, goalId: string) {
    return unwrap('Link skill', await supabase.from('skill_goals').upsert({ skill_id: skillId, goal_id: goalId }).select().single())
  },
  async unlink(skillId: string, goalId: string) {
    return unwrap('Unlink skill', await supabase.from('skill_goals').delete().eq('skill_id', skillId).eq('goal_id', goalId).select())
  },
  async remove(id: string) {
    return unwrap('Delete skill', await supabase.from('skills').delete().eq('id', id).select('id').single())
  },
}

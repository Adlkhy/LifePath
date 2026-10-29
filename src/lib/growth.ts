import type { ActivityDay, Goal, Skill, SkillLevel } from '../types/database'
import { todayKey } from './lifepath'

export const skillLevels: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert']

export function skillParentCandidates(id: string | null, skills: Skill[]) {
  if (!id) return skills
  const children = new Map<string, string[]>()
  for (const skill of skills) {
    if (skill.parent_id) {
      const branch = children.get(skill.parent_id) ?? []
      branch.push(skill.id)
      children.set(skill.parent_id, branch)
    }
  }
  const excluded = new Set<string>()
  const pending = [id]
  while (pending.length) {
    const current = pending.pop()!
    if (excluded.has(current)) continue
    excluded.add(current)
    pending.push(...children.get(current) ?? [])
  }
  return skills.filter((skill) => !excluded.has(skill.id))
}

export function skillParentProblem(id: string | null, parentId: string | null, skills: Skill[]) {
  const index = new Map(skills.map((skill) => [skill.id, skill]))
  const visited = new Set<string>()
  let cursor = parentId
  while (cursor) {
    if (cursor === id || visited.has(cursor)) return 'A skill cannot be its own ancestor.'
    visited.add(cursor)
    const parent = index.get(cursor)
    if (!parent) return 'Choose an existing skill as the parent.'
    cursor = parent.parent_id
  }
  return null
}

// Each stored ID contributes once, with no recursive parent rollups.
export function goalStatistics(goals: Goal[]) {
  const unique = [...new Map(goals.map((goal) => [goal.id, goal])).values()]
  const completed = unique.filter((goal) => goal.status === 'completed').length
  const categories = new Map<string, { total: number; completed: number }>()
  for (const goal of unique) {
    const category = goal.category?.trim() || 'Uncategorized'
    const counts = categories.get(category) ?? { total: 0, completed: 0 }
    counts.total++
    if (goal.status === 'completed') counts.completed++
    categories.set(category, counts)
  }
  return { total: unique.length, completed, rate: unique.length ? Math.round(completed / unique.length * 100) : null,
    active: unique.filter((goal) => goal.status === 'active').length,
    categories: [...categories].sort(([a], [b]) => a.localeCompare(b)).map(([name, counts]) => ({ name, ...counts })) }
}

export function activityWindow(day: string, year: number | null) {
  const end = new Date(`${day}T12:00:00`)
  end.setDate(end.getDate() + 1)
  const start = new Date(end)
  if (year !== null) {
    start.setFullYear(year, 0, 1)
    end.setFullYear(year + 1, 0, 1)
  } else {
    // Clamp leap-day anniversaries instead of allowing Date to spill into March.
    const month = start.getMonth()
    start.setFullYear(start.getFullYear() - 1)
    if (start.getMonth() !== month) start.setDate(0)
  }
  return { start: todayKey(start), end: todayKey(end) }
}

export function calendarDays(start: string, end: string) {
  const days: string[] = []
  const date = new Date(`${start}T12:00:00`)
  while (todayKey(date) < end) {
    days.push(todayKey(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

export function monthlyCompletions(days: ActivityDay[], start: string, end: string) {
  const months = new Map<string, number>()
  for (const day of calendarDays(start, end)) months.set(day.slice(0, 7), 0)
  for (const day of days) {
    const month = day.day.slice(0, 7)
    if (day.day >= start && day.day < end && months.has(month)) months.set(month, months.get(month)! + day.goal_count)
  }
  let cumulative = 0
  return [...months].map(([month, count]) => ({ month, count, cumulative: cumulative += count }))
}

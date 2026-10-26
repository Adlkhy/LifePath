import type { DailyPriority, Goal, ProgressEvent, ReviewPeriod } from '../types/database'
import { todayKey } from './lifepath'

export function reviewPeriod(type: ReviewPeriod, day: string) {
  const start = new Date(`${day}T00:00:00`)
  if (type === 'weekly') start.setDate(start.getDate() - (start.getDay() + 6) % 7)
  else start.setDate(1)
  const end = new Date(start)
  if (type === 'weekly') end.setDate(end.getDate() + 7)
  else end.setMonth(end.getMonth() + 1)
  const last = new Date(end)
  last.setDate(last.getDate() - 1)
  return { start: todayKey(start), end: todayKey(end), last: todayKey(last), fromTimestamp: start.toISOString(), toTimestamp: end.toISOString() }
}

export function reviewSummary(events: ProgressEvent[], priorities: DailyPriority[], goals: Goal[], start: string, end: string) {
  const completed = events.filter((event) => ['goal_completed', 'milestone_achieved'].includes(event.event_type)
    && todayKey(new Date(event.created_at)) >= start && todayKey(new Date(event.created_at)) < end)
  const priorityIds = new Set(priorities.filter((item) => item.priority_date >= start && item.priority_date < end).map((item) => item.goal_id))
  const unfinished = goals.filter((goal) => priorityIds.has(goal.id) && goal.status !== 'completed')
  return { completed, unfinished }
}

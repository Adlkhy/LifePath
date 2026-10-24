import type { Goal, Memory, ProgressEvent } from '../types/database'
import { eventTitle, label, todayKey } from './lifepath'
export type JourneyEntry = { id: string; type: 'memory' | 'reflection' | 'progress' | 'chapter'; date: string; title: string; description: string; chapterId: string | null; href: string }
export function journeyEntries(events: ProgressEvent[], memories: Memory[], goals: Goal[]): JourneyEntry[] {
  const byId = new Map(goals.map((goal) => [goal.id, goal]))
  return [
    ...events.map((event): JourneyEntry => {
      const metadata = event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata) ? event.metadata : {}
      return { id: `event:${event.id}`, type: event.event_type.startsWith('chapter_') ? 'chapter' : 'progress',
        date: event.created_at, title: eventTitle(event, goals), description: label(event.event_type),
        chapterId: event.chapter_id ?? (typeof metadata.chapter_id === 'string' ? metadata.chapter_id : null), href: `/app/journey/${event.id}` }
    }),
    ...memories.map((memory): JourneyEntry => ({ id: `memory:${memory.id}`, type: memory.kind, date: `${memory.memory_date}T12:00:00`, title: memory.title,
      description: memory.description ?? label(memory.kind), chapterId: memory.chapter_id ?? (memory.goal_id ? byId.get(memory.goal_id)?.chapter_id : null) ?? null, href: `/app/memories/${memory.id}` })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || a.id.localeCompare(b.id))
}
export function groupJourney(entries: JourneyEntry[], period: 'month' | 'year') {
  const groups = new Map<string, JourneyEntry[]>()
  for (const entry of entries) {
    const key = todayKey(new Date(entry.date)).slice(0, period === 'year' ? 4 : 7)
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }
  return [...groups.entries()]
}

import type { ConnectionType, Goal, GoalConnection, ProgressEvent } from '../types/database'

export const goalTypes = ['vision', 'goal', 'milestone', 'quest'] as const
export const goalStatuses = ['planned', 'active', 'completed', 'paused', 'abandoned'] as const
export const chapterStatuses = ['planned', 'active', 'completed', 'archived'] as const
export const label = (value: string) => value.replaceAll('_', ' ').replace(/^./, (char) => char.toUpperCase())

export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function dateLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`))
}

export function childProgress(goalId: string, goals: Goal[]) {
  const children = goals.filter((goal) => goal.parent_id === goalId)
  return { total: children.length, completed: children.filter((goal) => goal.status === 'completed').length }
}

export function validParent(goalId: string, parentId: string, goals: Goal[]): boolean {
  const seen = new Set<string>([goalId])
  let current: string | null = parentId
  while (current) {
    if (seen.has(current)) return false
    seen.add(current)
    const parent = goals.find((goal) => goal.id === current)
    if (!parent) return false
    current = parent.parent_id
  }
  return true
}

export function connectionProblem(source: string, target: string, type: ConnectionType, connections: GoalConnection[]): string | null {
  if (!source || !target) return 'Choose a goal to connect.'
  if (source === target) return 'A goal cannot connect to itself.'
  if (connections.some((edge) => edge.connection_type === type && (
    (edge.source_goal_id === source && edge.target_goal_id === target) ||
    (type === 'related' && edge.source_goal_id === target && edge.target_goal_id === source)
  ))) return 'These goals already have this connection.'
  if (type === 'prerequisite') {
    const visited = new Set<string>()
    const queue = [target]
    while (queue.length) {
      const id = queue.pop()!
      if (id === source) return 'This prerequisite would create a circular dependency.'
      if (visited.has(id)) continue
      visited.add(id)
      connections.filter((edge) => edge.connection_type === 'prerequisite' && edge.source_goal_id === id)
        .forEach((edge) => queue.push(edge.target_goal_id))
    }
  }
  return null
}

export function unmetPrerequisites(goalId: string, goals: Goal[], connections: GoalConnection[]) {
  return connections.filter((edge) => edge.connection_type === 'prerequisite' && edge.target_goal_id === goalId)
    .filter((edge) => goals.find((goal) => goal.id === edge.source_goal_id)?.status !== 'completed')
    .map((edge) => ({ id: edge.source_goal_id, title: goals.find((goal) => goal.id === edge.source_goal_id)?.title ?? 'Unavailable prerequisite' }))
}

export function focusItems(goals: Goal[], connections: GoalConnection[], now = new Date()) {
  const today = todayKey(now)
  const end = new Date(now)
  end.setDate(end.getDate() + 30)
  const open = goals.filter((goal) => !['completed', 'abandoned'].includes(goal.status))
  const rank = (a: Goal, b: Goal) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER)
    || (a.target_date ?? '9999').localeCompare(b.target_date ?? '9999') || a.title.localeCompare(b.title)
  const quests = open.filter((goal) => goal.type === 'quest' && goal.status !== 'paused')
  return {
    today,
    available: quests.filter((goal) => !unmetPrerequisites(goal.id, goals, connections).length).sort(rank),
    blocked: quests.filter((goal) => unmetPrerequisites(goal.id, goals, connections).length).sort(rank),
    active: open.filter((goal) => goal.status === 'active' && goal.type !== 'quest').sort(rank),
    deadlines: open.filter((goal) => goal.target_date && goal.target_date <= todayKey(end))
      .sort((a, b) => a.target_date!.localeCompare(b.target_date!) || rank(a, b)),
  }
}

export function eventTitle(event: ProgressEvent, goals: Goal[]): string {
  const metadata = event.metadata
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata) && typeof metadata.title === 'string') return metadata.title
  return goals.find((goal) => goal.id === event.goal_id)?.title ?? 'Journey update'
}

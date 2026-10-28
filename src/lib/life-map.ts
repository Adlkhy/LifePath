import dagre from 'dagre'
import type { Goal, GoalConnection, GoalStatus, GoalType } from '../types/database'
import { matchesDifficulty, progressionIndex, type DifficultyFilter } from './lifepath'

export const NODE_WIDTH = 240
export const NODE_HEIGHT = 200
export type MapPosition = { x: number; y: number }
export type MapPositions = Record<string, MapPosition>
export type MapFilters = { type: GoalType | ''; status: GoalStatus | ''; chapter: string; search: string; difficulty: DifficultyFilter }

export function filterMapGoals(goals: Goal[], filters: MapFilters) {
  const search = filters.search.trim().toLocaleLowerCase()
  return goals.filter((goal) => (!filters.type || goal.type === filters.type)
    && (!filters.status || goal.status === filters.status)
    && matchesDifficulty(goal, filters.difficulty)
    && (!filters.chapter || (filters.chapter === 'none' ? !goal.chapter_id : goal.chapter_id === filters.chapter))
    && (!search || goal.title.toLocaleLowerCase().includes(search)))
}

/** Layout the entire graph, never the filtered subset. Related links do not imply progression. */
export function layoutGoals(goals: Goal[], connections: GoalConnection[]): MapPositions {
  if (!goals.length) return {}
  const graph = new dagre.graphlib.Graph().setGraph({ rankdir: 'BT', nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 })
    .setDefaultEdgeLabel(() => ({}))
  const ids = new Set(goals.map((goal) => goal.id))
  const connected = new Set<string>()
  const link = (source: string, target: string) => {
    if (!ids.has(source) || !ids.has(target)) return
    graph.setEdge(source, target)
    connected.add(source); connected.add(target)
  }
  // Stable insertion order avoids jumps due to repository ordering changes.
  const orderedGoals = [...goals].sort((a, b) => a.id.localeCompare(b.id))
  for (const goal of orderedGoals) graph.setNode(goal.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  for (const goal of orderedGoals) if (goal.parent_id) link(goal.id, goal.parent_id)
  for (const edge of [...connections].sort((a, b) => a.source_goal_id.localeCompare(b.source_goal_id) || a.target_goal_id.localeCompare(b.target_goal_id))) if (edge.connection_type === 'prerequisite') link(edge.source_goal_id, edge.target_goal_id)
  dagre.layout(graph)
  const typeRank = { vision: 0, goal: 1, milestone: 2, quest: 3 }
  return Object.fromEntries(goals.map((goal) => {
    const point = graph.node(goal.id)
    return [goal.id, { x: point.x - NODE_WIDTH / 2, y: connected.has(goal.id) ? point.y - NODE_HEIGHT / 2 : 40 + typeRank[goal.type] * (NODE_HEIGHT + 100) }]
  }))
}

export function initialPositions(goals: Goal[], connections: GoalConnection[]): MapPositions {
  const positions: MapPositions = {}
  for (const goal of goals) {
    if (goal.position_x !== null && goal.position_y !== null && Number.isFinite(goal.position_x) && Number.isFinite(goal.position_y)) {
      positions[goal.id] = { x: goal.position_x, y: goal.position_y }
    }
  }
  if (Object.keys(positions).length === goals.length) return positions
  const automatic = layoutGoals(goals, connections)
  // Newly created goals must not cover manually arranged nodes.
  for (const goal of [...goals].sort((a, b) => a.id.localeCompare(b.id))) {
    if (positions[goal.id]) continue
    const position = { ...automatic[goal.id] }
    while (Object.values(positions).some((other) => Math.abs(position.x - other.x) < NODE_WIDTH + 24 && Math.abs(position.y - other.y) < NODE_HEIGHT + 24)) position.x += NODE_WIDTH + 60
    positions[goal.id] = position
  }
  return positions
}

/** Small derived index: status changes update parent progress and prerequisite locks in O(V+E). */
export function mapFeedback(goals: Goal[], connections: GoalConnection[]) {
  return progressionIndex(goals, connections)
}

import { createContext } from 'react'
import type { Chapter, Goal, GoalConnection } from '../types/database'
import type { GoalProgression } from '../lib/lifepath'

export type LifeData = { chapters: Chapter[]; goals: Goal[]; connections: GoalConnection[] }
export type LifeDataState = LifeData & {
  progression: Map<string, GoalProgression>
  loading: boolean
  error: string | null
  refresh: () => void
  patchGoal: (id: string, patch: Partial<Goal>) => void
  putConnection: (connection: GoalConnection) => void
  forgetConnection: (id: string) => void
}
export const LifeDataContext = createContext<LifeDataState | undefined>(undefined)

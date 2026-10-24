import { createContext } from 'react'
import type { Chapter, Goal, GoalConnection } from '../types/database'

export type LifeData = { chapters: Chapter[]; goals: Goal[]; connections: GoalConnection[] }
export type LifeDataState = LifeData & {
  loading: boolean
  error: string | null
  refresh: () => void
  patchGoal: (id: string, patch: Partial<Goal>) => void
  putConnection: (connection: GoalConnection) => void
  forgetConnection: (id: string) => void
}
export const LifeDataContext = createContext<LifeDataState | undefined>(undefined)

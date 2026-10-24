import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { chaptersRepository } from '../repositories/chapters.repository'
import { goalsRepository } from '../repositories/goals.repository'
import { connectionsRepository } from '../repositories/connections.repository'
import { errorMessage } from '../lib/data-error'
import { LifeDataContext, type LifeData } from './life-data-context'
import type { Goal, GoalConnection } from '../types/database'

export function LifeDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LifeData>({ chapters: [], goals: [], connections: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    void Promise.all([chaptersRepository.listAll(), goalsRepository.listAll(), connectionsRepository.listAll()])
      .then(([chapters, goals, connections]) => {
        if (active) { setData({ chapters, goals, connections }); setLoading(false); setError(null) }
      }).catch((cause: unknown) => {
        if (active) { setLoading(false); setError(errorMessage(cause)) }
      })
    return () => { active = false }
  }, [revision])
  function refresh() { setLoading(true); setError(null); setRevision((value) => value + 1) }
  const patchGoal = useCallback((id: string, patch: Partial<Goal>) => {
    setData((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === id ? { ...goal, ...patch } : goal) }))
  }, [])
  const putConnection = useCallback((connection: GoalConnection) => {
    setData((current) => ({ ...current, connections: [...current.connections.filter((item) => item.id !== connection.id), connection] }))
  }, [])
  const forgetConnection = useCallback((id: string) => {
    setData((current) => ({ ...current, connections: current.connections.filter((item) => item.id !== id) }))
  }, [])
  return <LifeDataContext.Provider value={{ ...data, loading, error, refresh, patchGoal, putConnection, forgetConnection }}>{children}</LifeDataContext.Provider>
}

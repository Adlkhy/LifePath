import { useEffect, useState, type ReactNode } from 'react'
import { chaptersRepository } from '../repositories/chapters.repository'
import { goalsRepository } from '../repositories/goals.repository'
import { connectionsRepository } from '../repositories/connections.repository'
import { errorMessage } from '../lib/data-error'
import { LifeDataContext, type LifeData } from './life-data-context'

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
  return <LifeDataContext.Provider value={{ ...data, loading, error, refresh }}>{children}</LifeDataContext.Provider>
}

import { useContext } from 'react'
import { LifeDataContext } from '../state/life-data-context'

export function useLifeData() {
  const data = useContext(LifeDataContext)
  if (!data) throw new Error('useLifeData must be used within LifeDataProvider.')
  return data
}

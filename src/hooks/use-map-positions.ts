import { useCallback, useEffect, useRef, useState } from 'react'
import { useBeforeUnload } from 'react-router-dom'
import { goalsRepository } from '../repositories/goals.repository'
import { errorMessage } from '../lib/data-error'
import { useLifeData } from './use-life-data'
import { initialPositions, type MapPositions } from '../lib/life-map'

type Coordinates = { position_x: number | null; position_y: number | null }

export function useMapPositions() {
  const { goals, connections, patchGoal } = useLifeData()
  const [positions, setPositions] = useState(() => initialPositions(goals, connections))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(new Map<string, Coordinates>())
  const failures = useRef(new Map<string, Coordinates>())
  const running = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useBeforeUnload(useCallback((event) => {
    if (running.current || failures.current.size) { event.preventDefault(); event.returnValue = '' }
  }, []))

  // Serialize writes, coalesce repeated keyboard/drag moves, and retain failed writes for retry.
  const drain = useCallback(async () => {
    if (running.current) return
    running.current = true
    setSaving(true)
    while (pending.current.size) {
      const [id, coordinates] = pending.current.entries().next().value!
      pending.current.delete(id)
      try {
        const saved = await goalsRepository.update(id, coordinates)
        failures.current.delete(id)
        // Do not apply a stale status/title from a position request racing a completion request.
        patchGoal(id, { position_x: saved.position_x, position_y: saved.position_y })
      } catch (cause) {
        failures.current.set(id, coordinates)
        if (mounted.current) setError(errorMessage(cause))
      }
    }
    running.current = false
    if (mounted.current) { setSaving(false); if (!failures.current.size) setError(null) }
  }, [patchGoal])

  const save = useCallback((next: MapPositions, reset = false) => {
    for (const [id, point] of Object.entries(next)) pending.current.set(id, reset ? { position_x: null, position_y: null } : { position_x: point.x, position_y: point.y })
    void drain()
  }, [drain])
  const retry = useCallback(() => {
    for (const [id, point] of failures.current) if (!pending.current.has(id)) pending.current.set(id, point)
    void drain()
  }, [drain])
  return { positions, setPositions, save, saving, error, retry }
}

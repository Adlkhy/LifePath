import { CheckCircle2, Circle, CirclePause, LockKeyhole, Play, X } from 'lucide-react'
import { label, progressionState } from '../../lib/lifepath'
import type { GoalStatus } from '../../types/database'

const icons = { available: Circle, blocked: LockKeyhole, active: Play, completed: CheckCircle2, paused: CirclePause, abandoned: X }
export function ProgressionBadge({ status, locked }: { status: GoalStatus; locked: number }) {
  const state = progressionState(status, locked)
  const Icon = icons[state]
  return <span data-progression={state} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${state === 'blocked' ? 'border-dashed' : state === 'active' ? 'border-current font-semibold' : state === 'completed' ? 'bg-muted' : ''}`}><Icon size={12} aria-hidden="true" />{label(state)}{state === 'blocked' && status === 'active' ? ' · Active' : ''}</span>
}

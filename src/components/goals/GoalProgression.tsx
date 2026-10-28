import { Link } from 'react-router-dom'
import type { Goal } from '../../types/database'
import { useLifeData } from '../../hooks/use-life-data'
import { useProgressionAnimation } from '../../hooks/use-progression-animation'
import { ProgressionBadge } from './ProgressionBadge'
import { DifficultyBadge } from './DifficultyBadge'

export function GoalProgression({ goal }: { goal: Goal }) {
  const { progression } = useLifeData()
  const info = progression.get(goal.id)!
  const ref = useProgressionAnimation(goal.status, info.locked, goal.type)
  return <section ref={ref} className="space-y-3 rounded-lg border p-4" aria-label="Goal progression">
    <div className="flex flex-wrap items-center gap-3"><ProgressionBadge status={goal.status} locked={info.locked} />{goal.type === 'quest' && <DifficultyBadge difficulty={goal.difficulty} />}</div>
    {info.unmet.length > 0 ? <div><h3 className="text-sm font-medium">Unmet prerequisites</h3><ul className="mt-2 space-y-1 text-sm">{info.unmet.map((item) => <li key={item.id}><Link className="wrap-break-word underline" to={`/app/goals/${item.id}`}>{item.title}</Link></li>)}</ul><p className="mt-2 text-xs text-muted-foreground">Prerequisites are guidance. You can still edit or complete this goal.</p></div> : <p className="text-sm text-muted-foreground">All prerequisites met.</p>}
    {info.dependents.length > 0 && <div><h3 className="text-sm font-medium">What this opens up</h3><ul className="mt-2 space-y-2 text-sm">{info.dependents.map((item) => {
      const remaining = progression.get(item.id)!.unmet.filter((required) => required.id !== goal.id).length
      const message = item.status === 'completed' ? 'Completed' : item.status === 'abandoned' ? 'Abandoned' : item.status === 'paused' ? 'Paused' : remaining ? `${remaining} other prerequisite${remaining === 1 ? '' : 's'} remaining` : goal.status === 'completed' ? 'Prerequisites met' : 'Ready after completing this goal'
      return <li key={item.id}><Link className="wrap-break-word underline" to={`/app/goals/${item.id}`}>{item.title}</Link><p className="text-xs text-muted-foreground">{message}</p></li>
    })}</ul></div>}
  </section>
}

import { Link } from 'react-router-dom'
import type { Goal } from '../../types/database'
import { useLifeData } from '../../hooks/use-life-data'
import { childProgress, dateLabel, label, todayKey, unmetPrerequisites } from '../../lib/lifepath'
import { EmptyState } from '../shared/EmptyState'

export function GoalList({ goals, empty = 'No goals yet.' }: { goals: Goal[]; empty?: string }) {
  const data = useLifeData()
  if (!goals.length) return <EmptyState>{empty}</EmptyState>
  return <ul className="grid gap-3 sm:grid-cols-2">{goals.map((goal) => {
    const progress = childProgress(goal.id, data.goals)
    const unmet = unmetPrerequisites(goal.id, data.goals, data.connections)
    const parent = data.goals.find((item) => item.id === goal.parent_id)
    const overdue = goal.target_date && goal.target_date < todayKey() && !['completed', 'abandoned'].includes(goal.status)
    return <li key={goal.id} className="min-w-0 space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{label(goal.type)}</span><span className="rounded-md bg-muted px-2 py-1 text-foreground">{label(goal.status)}</span></div>
      <h3 className="wrap-break-word font-semibold"><Link className="underline-offset-4 hover:underline" to={`/app/goals/${goal.id}`}>{goal.title}</Link></h3>
      {parent && <p className="wrap-break-word text-sm text-muted-foreground">Part of <Link className="underline" to={`/app/goals/${parent.id}`}>{parent.title}</Link></p>}
      {goal.target_date && <p className={overdue ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{overdue ? 'Overdue · ' : 'Due '}{dateLabel(goal.target_date)}</p>}
      {progress.total > 0 && <div className="space-y-1"><p className="text-sm">{progress.completed} of {progress.total} direct steps complete</p><progress className="h-2 w-full accent-primary" value={progress.completed} max={progress.total} aria-label={`${goal.title}: direct child completion`} /></div>}
      {unmet.length > 0 && <p className="text-sm text-muted-foreground">Waiting on {unmet.length} prerequisite{unmet.length === 1 ? '' : 's'}</p>}
    </li>
  })}</ul>
}

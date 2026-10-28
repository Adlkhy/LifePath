import { MotionCard } from '../ui/motion'
import { Link } from 'react-router-dom'
import type { Goal } from '../../types/database'
import type { GoalProgression } from '../../lib/lifepath'
import { useLifeData } from '../../hooks/use-life-data'
import { dateLabel, label, todayKey } from '../../lib/lifepath'
import { useProgressionAnimation } from '../../hooks/use-progression-animation'
import { EmptyState } from '../shared/EmptyState'
import { ProgressionBadge } from './ProgressionBadge'
import { DifficultyBadge } from './DifficultyBadge'
import { GoalProgress } from './GoalProgress'

function GoalCard({ goal, progress, parent }: { goal: Goal; progress: GoalProgression; parent?: Goal }) {
  const ref = useProgressionAnimation<HTMLLIElement>(goal.status, progress.locked, goal.type)
  const overdue = goal.target_date && goal.target_date < todayKey() && !['completed', 'abandoned'].includes(goal.status)
  return <li ref={ref} className="min-w-0 rounded-lg"><MotionCard data-goal-type={goal.type} className="goal-card h-full min-w-0 space-y-3 rounded-lg border bg-card text-card-foreground">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span className="goal-type">{label(goal.type)}</span><ProgressionBadge status={goal.status} locked={progress.locked} /></div>
    <h3 className="wrap-break-word font-semibold"><Link className="underline-offset-4 hover:underline" to={`/app/goals/${goal.id}`}>{goal.title}</Link></h3>
    {goal.type === 'quest' && <DifficultyBadge difficulty={goal.difficulty} />}
    {parent && <p className="wrap-break-word text-sm text-muted-foreground">Part of <Link className="underline" to={`/app/goals/${parent.id}`}>{parent.title}</Link></p>}
    {goal.target_date && <p className={overdue ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{overdue ? 'Overdue · ' : 'Due '}{dateLabel(goal.target_date)}</p>}
    {progress.total > 0 && <div className="space-y-1"><p className="text-sm">{progress.completed} of {progress.total} direct steps complete</p><GoalProgress completed={progress.completed} total={progress.total} label={`${goal.title}: direct child completion`} /></div>}
    {progress.locked > 0 && <p className="wrap-break-word text-sm text-muted-foreground">{goal.status === 'completed' ? 'Unmet prerequisites' : 'Waiting on'}: {progress.unmet.map((item) => item.title).join(', ')}</p>}
  </MotionCard></li>
}

export function GoalList({ goals, empty = 'No goals yet.' }: { goals: Goal[]; empty?: string }) {
  const data = useLifeData()
  const byId = new Map(data.goals.map((goal) => [goal.id, goal]))
  if (!goals.length) return <EmptyState>{empty}</EmptyState>
  return <ul className="grid gap-3 sm:grid-cols-2">{goals.map((goal) => <GoalCard key={goal.id} goal={goal} progress={data.progression.get(goal.id)!} parent={goal.parent_id ? byId.get(goal.parent_id) : undefined} />)}</ul>
}

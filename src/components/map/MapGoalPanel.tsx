import { Link } from 'react-router-dom'
import type { Goal } from '../../types/database'
import { useLifeData } from '../../hooks/use-life-data'
import { useMutation } from '../../hooks/use-mutation'
import { goalsRepository } from '../../repositories/goals.repository'
import { childProgress, dateLabel, label } from '../../lib/lifepath'
import { Button } from '../ui/button'
import { GoalConnections } from '../goals/GoalConnections'
import { GoalProgression } from '../goals/GoalProgression'
import { GoalProgress } from '../goals/GoalProgress'

export function MapGoalPanel({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { goals, chapters, patchGoal } = useLifeData()
  const mutation = useMutation()
  const progress = childProgress(goal.id, goals)
  const chapter = chapters.find((item) => item.id === goal.chapter_id)
  async function toggleComplete() {
    await mutation.run(async () => {
      const saved = await goalsRepository.update(goal.id, { status: goal.status === 'completed' ? 'active' : 'completed' })
      patchGoal(goal.id, { status: saved.status, completed_at: saved.completed_at })
    }, goal.status === 'completed' ? 'Goal reopened.' : `${label(goal.type)} completed.`)
  }
  return <section aria-labelledby="map-goal-heading" className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label(goal.type)} · {label(goal.status)}</p><h2 id="map-goal-heading" className="wrap-break-word text-xl font-semibold">{goal.title}</h2></div><Button variant="outline" onClick={onClose} aria-label="Close goal panel">Close</Button></div>
    {goal.description && <p className="whitespace-pre-wrap wrap-break-word text-sm">{goal.description}</p>}
    <p className="text-sm">{chapter?.title ?? 'No chapter'} · {goal.target_date ? dateLabel(goal.target_date) : 'No deadline'}</p>
    {progress.total > 0 && <div className="space-y-2"><p className="text-sm">{progress.completed} of {progress.total} direct steps complete ({Math.round(progress.completed / progress.total * 100)}%)</p><GoalProgress label="Direct child completion" total={progress.total} completed={progress.completed} /></div>}
    <div className="flex flex-wrap gap-2"><Button disabled={mutation.busy} onClick={() => void toggleComplete()}>{mutation.busy ? 'Saving…' : goal.status === 'completed' ? 'Reopen goal' : 'Complete goal'}</Button><Button variant="outline" render={<Link to={`/app/goals/${goal.id}`} />}>View full details</Button></div>
    {mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}
    {goal.status === 'completed' && <Button variant="outline" render={<Link to={`/app/memories/new?goal=${goal.id}&kind=reflection`} />}>Write an optional reflection</Button>}
    <GoalProgression goal={goal} />
    <GoalConnections goal={goal} inPlace />
  </section>
}

import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLifeData } from '../hooks/use-life-data'
import { useMutation } from '../hooks/use-mutation'
import { goalsRepository } from '../repositories/goals.repository'
import type { GoalStatus } from '../types/database'
import { childProgress, dateLabel, label } from '../lib/lifepath'
import { PageHeading } from '../components/shared/PageHeading'
import { DeleteRecord } from '../components/shared/DeleteRecord'
import { Button } from '../components/ui/button'
import { GoalList } from '../components/goals/GoalList'
import { GoalConnections } from '../components/goals/GoalConnections'

export function GoalDetailPage() {
  const { id } = useParams()
  const { goals, chapters, refresh } = useLifeData()
  const mutation = useMutation()
  const navigate = useNavigate()
  const goal = goals.find((item) => item.id === id)
  if (!goal) return <p>Goal not found. <Link to="/app/goals" className="underline">Back to goals</Link></p>
  const chapter = chapters.find((item) => item.id === goal.chapter_id)
  const parent = goals.find((item) => item.id === goal.parent_id)
  const progress = childProgress(goal.id, goals)
  async function status(value: GoalStatus) {
    if (await mutation.run(() => goalsRepository.update(goal!.id, { status: value }))) refresh()
  }
  async function remove() {
    if (await mutation.run(() => goalsRepository.remove(goal!.id))) { refresh(); navigate('/app/goals', { replace: true }) }
  }
  return <>
    <Link className="text-sm underline" to="/app/goals">All goals</Link>
    <PageHeading title={goal.title} description={`${label(goal.type)} · ${label(goal.status)}`}><Button variant="outline" render={<Link to={`/app/goals/${goal.id}/edit`} />}>Edit goal</Button></PageHeading>
    <div className="flex flex-wrap gap-2" aria-label="Change goal status">
      {goal.status !== 'completed' && <Button disabled={mutation.busy} onClick={() => void status('completed')}>Complete</Button>}
      {goal.status !== 'active' && <Button variant="outline" disabled={mutation.busy} onClick={() => void status('active')}>{goal.status === 'completed' || goal.status === 'abandoned' ? 'Reopen' : goal.status === 'paused' ? 'Resume' : 'Start'}</Button>}
      {goal.status === 'active' && <Button variant="outline" disabled={mutation.busy} onClick={() => void status('paused')}>Pause</Button>}
      {!['completed', 'abandoned'].includes(goal.status) && <Button variant="outline" disabled={mutation.busy} onClick={() => void status('abandoned')}>Abandon</Button>}
    </div>
    {mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}
    <dl className="grid gap-4 rounded-lg border bg-card p-4 text-card-foreground sm:grid-cols-2">
      <div><dt className="text-sm text-muted-foreground">Chapter</dt><dd>{chapter ? <Link className="break-words underline" to={`/app/chapters/${chapter.id}`}>{chapter.title}</Link> : 'No chapter'}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Parent</dt><dd>{parent ? <Link className="break-words underline" to={`/app/goals/${parent.id}`}>{parent.title}</Link> : 'No parent'}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Deadline</dt><dd>{goal.target_date ? dateLabel(goal.target_date) : 'No deadline'}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Category</dt><dd className="break-words">{goal.category || 'Uncategorized'}</dd></div>
      {goal.priority != null && <div><dt className="text-sm text-muted-foreground">Priority</dt><dd>{goal.priority}</dd></div>}
      {goal.completed_at && <div><dt className="text-sm text-muted-foreground">Completed</dt><dd>{new Date(goal.completed_at).toLocaleString()}</dd></div>}
    </dl>
    {([['Description', goal.description], ['Why this matters', goal.motivation], ['Success criteria', goal.success_criteria]] as const).map(([title, text]) => text && <section key={title} className="space-y-2"><h2 className="text-lg font-semibold">{title}</h2><p className="whitespace-pre-wrap break-words">{text}</p></section>)}
    <section className="space-y-4" aria-labelledby="steps-heading"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="steps-heading" className="text-xl font-semibold">Milestones & steps</h2><Button render={<Link to={`/app/goals/new?parent=${goal.id}&type=${goal.type === 'milestone' ? 'quest' : 'milestone'}`} />}>Add a step</Button></div>
      {progress.total > 0 && <div><p>{progress.completed} of {progress.total} direct steps complete ({Math.round(progress.completed / progress.total * 100)}%)</p><progress aria-label="Direct child completion" className="h-2 w-full accent-primary" max={progress.total} value={progress.completed} /></div>}
      <GoalList goals={goals.filter((item) => item.parent_id === goal.id)} empty="Break this goal into milestones or quests. Steps can have their own nested steps." />
    </section>
    <GoalConnections key={`connections:${goal.id}`} goal={goal} />
    <DeleteRecord key={`delete:${goal.id}`} name="goal" explanation="Its children and journey history will remain; its connections will be removed." busy={mutation.busy} onDelete={() => void remove()} />
  </>
}

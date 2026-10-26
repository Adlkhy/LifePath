import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useLifeData } from '../../hooks/use-life-data'
import { useLocalDay } from '../../hooks/use-local-day'
import { useResource } from '../../hooks/use-resource'
import { useMutation } from '../../hooks/use-mutation'
import { prioritiesRepository } from '../../repositories/priorities.repository'
import { dateLabel, label, todayKey } from '../../lib/lifepath'
import { ResourceState } from '../shared/ResourceState'
import { Button } from '../ui/button'
import { Field, Select } from '../ui/form-controls'

function DayPriorities({ day }: { day: string }) {
  const { goals } = useLifeData()
  const load = useCallback(() => prioritiesRepository.forDay(day), [day])
  const resource = useResource(load)
  const mutation = useMutation()
  const ids = resource.data?.map((item) => item.goal_id) ?? []
  const eligible = goals.filter((goal) => ['goal', 'quest'].includes(goal.type) && !['completed', 'abandoned'].includes(goal.status))
  async function save(nextIds: string[]) {
    if (await mutation.run(async () => {
      if (day !== todayKey()) throw new Error('A new day has started. Choose priorities for today.')
      await prioritiesRepository.save(day, nextIds)
    }, 'Daily priorities saved.')) resource.reload()
  }
  function move(index: number, direction: number) {
    const next = [...ids]
    ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
    void save(next)
  }
  return <section aria-labelledby="top-three-heading" className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
    <div><h2 id="top-three-heading" className="text-xl font-semibold">Daily Top 3</h2><p className="text-sm text-muted-foreground">{dateLabel(day)} · Choose up to three goals or quests. Each day starts with an empty selection.</p></div>
    <ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />
    {mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}
    {resource.data && <>
      <ol className="space-y-3">{ids.map((id, index) => {
        const goal = goals.find((item) => item.id === id)
        return <li key={id} className="space-y-3 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><Link className="wrap-break-word font-medium underline" to={`/app/goals/${id}`}>{index + 1}. {goal?.title ?? 'View goal'}</Link><span className="text-sm text-muted-foreground">{goal ? label(goal.status) : 'Unavailable'}</span></div>
          <Field id={`priority-${index}`} label={`Replace priority ${index + 1}`}><Select id={`priority-${index}`} disabled={mutation.busy} value={id} onChange={(e) => void save(ids.map((current, slot) => slot === index ? e.target.value : current))}><option value={id}>{goal?.title ?? 'Current goal'}</option>{eligible.filter((item) => !ids.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.title} ({item.type})</option>)}</Select></Field>
          <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={mutation.busy || index === 0} aria-label={`Move priority ${index + 1} up`} onClick={() => move(index, -1)}>Move up</Button><Button variant="outline" disabled={mutation.busy || index === ids.length - 1} aria-label={`Move priority ${index + 1} down`} onClick={() => move(index, 1)}>Move down</Button><Button variant="outline" disabled={mutation.busy} onClick={() => void save(ids.filter((current) => current !== id))}>Remove<span className="sr-only"> priority {index + 1}</span></Button></div>
        </li>
      })}</ol>
      {ids.length < 3 && <Field id="add-priority" label={`Choose priority ${ids.length + 1}`}><Select id="add-priority" disabled={mutation.busy} value="" onChange={(e) => { if (e.target.value) void save([...ids, e.target.value]) }}><option value="">Select a goal or quest</option>{eligible.filter((item) => !ids.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.title} ({item.type})</option>)}</Select></Field>}
      {!eligible.length && !ids.length && <p className="text-sm text-muted-foreground">Create or reopen a goal or quest to choose it here.</p>}
    </>}
  </section>
}

export function DailyTopThree() {
  const day = useLocalDay()
  return <DayPriorities key={day} day={day} />
}

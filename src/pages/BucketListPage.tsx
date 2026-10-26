import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLifeData } from '../hooks/use-life-data'
import { useResource } from '../hooks/use-resource'
import { useMutation } from '../hooks/use-mutation'
import { bucketListRepository } from '../repositories/bucket-list.repository'
import { goalsRepository } from '../repositories/goals.repository'
import { memoriesRepository } from '../repositories/memories.repository'
import { progressRepository } from '../repositories/progress.repository'
import { dateLabel, label } from '../lib/lifepath'
import { PageHeading } from '../components/shared/PageHeading'
import { ResourceState } from '../components/shared/ResourceState'
import { EmptyState } from '../components/shared/EmptyState'
import { Button } from '../components/ui/button'
import { Field, Input, Select, Textarea } from '../components/ui/form-controls'

const loadBucket = async () => {
  const [items, memories, events] = await Promise.all([bucketListRepository.listAll(), memoriesRepository.listAll(), progressRepository.listAll()])
  return { items, memories, events }
}

export function BucketListPage() {
  const { goals, refresh, patchGoal } = useLifeData()
  const resource = useResource(loadBucket)
  const mutation = useMutation()
  const [mode, setMode] = useState<'existing' | 'new' | null>(null)
  const [selected, setSelected] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('all')
  const [draft, setDraft] = useState({ title: '', description: '', category: '', target_date: '' })
  const memberIds = new Set(resource.data?.items.map((item) => item.goal_id))
  const experiences = goals.filter((goal) => memberIds.has(goal.id))
  const categories = [...new Set(experiences.map((goal) => goal.category ?? ''))].sort()
  const filtered = experiences.filter((goal) => (!category || (goal.category ?? '') === category.slice(1))
    && (status === 'all' || (status === 'completed' ? goal.status === 'completed' : goal.status !== 'completed')))
  async function add(event: FormEvent) {
    event.preventDefault()
    if (await mutation.run(async () => {
      if (mode === 'existing') {
        if (!selected) throw new Error('Choose an existing goal.')
        await bucketListRepository.add(selected)
      } else {
        if (!draft.title.trim()) throw new Error('Enter an experience title.')
        await bucketListRepository.create({ title: draft.title.trim(), description: draft.description.trim() || null, category: draft.category.trim() || null, target_date: draft.target_date || null })
      }
    }, 'Experience added to your Bucket List.')) {
      const created = mode === 'new'
      setMode(null); setSelected(''); setDraft({ title: '', description: '', category: '', target_date: '' })
      resource.reload()
      if (created) refresh()
    }
  }
  async function complete(id: string) {
    await mutation.run(async () => { const saved = await goalsRepository.update(id, { status: 'completed' }); patchGoal(id, saved) }, 'Experience completed.')
  }
  async function remove(id: string) {
    if (await mutation.run(() => bucketListRepository.remove(id), 'Removed from Bucket List. Your goal is still saved.')) resource.reload()
  }
  return <>
    <PageHeading title="Bucket List" description="Experiences you want to have in your lifetime."><Button disabled={!resource.data || mutation.busy} onClick={() => setMode('new')}>New experience</Button><Button variant="outline" disabled={!resource.data || mutation.busy} onClick={() => setMode('existing')}>Add existing goal</Button></PageHeading>
    <ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />
    {mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}
    {mode && <form aria-label={mode === 'new' ? 'Create experience' : 'Add existing experience'} onSubmit={add} className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
      <h2 className="text-lg font-semibold">{mode === 'new' ? 'New experience' : 'Choose an experience from your goals'}</h2>
      <p className="text-sm text-muted-foreground">Think of places to visit, things to try, and moments to live. Experiences also appear in Goals.</p>
      <fieldset disabled={mutation.busy} className="space-y-4"><legend className="sr-only">Experience details</legend>
        {mode === 'existing' ? <Field id="bucket-goal" label="Existing goal"><Select id="bucket-goal" required value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Select a goal</option>{goals.filter((goal) => !memberIds.has(goal.id)).map((goal) => <option key={goal.id} value={goal.id}>{goal.title} ({goal.type})</option>)}</Select></Field> : <>
          <Field id="experience-title" label="Experience"><Input id="experience-title" required maxLength={300} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="See the northern lights" /></Field>
          <Field id="experience-description" label="Description (optional)"><Textarea id="experience-description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field id="experience-category" label="Category (optional)"><Input id="experience-category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></Field><Field id="experience-date" label="Target date (optional)"><Input id="experience-date" type="date" value={draft.target_date} onChange={(e) => setDraft({ ...draft, target_date: e.target.value })} /></Field></div>
        </>}
      </fieldset>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={mutation.busy}>{mutation.busy ? 'Saving…' : 'Add experience'}</Button><Button variant="outline" disabled={mutation.busy} onClick={() => setMode(null)}>Cancel</Button></div>
    </form>}
    <div className="grid gap-4 sm:grid-cols-2"><Field id="bucket-category" label="Category"><Select id="bucket-category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item} value={`:${item}`}>{item || 'Uncategorized'}</option>)}</Select></Field><Field id="bucket-status" label="Completion"><Select id="bucket-status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All experiences</option><option value="unfinished">Not completed</option><option value="completed">Completed</option></Select></Field></div>
    {resource.data && !filtered.length && <EmptyState>No experiences here yet. Add one or change your filters.</EmptyState>}
    <ul className="grid gap-4 sm:grid-cols-2">{filtered.map((goal) => {
      const eventIds = new Set(resource.data?.events.filter((event) => event.goal_id === goal.id).map((event) => event.id))
      const memories = resource.data?.memories.filter((memory) => memory.goal_id === goal.id || (memory.event_id && eventIds.has(memory.event_id))) ?? []
      return <li key={goal.id} className="min-w-0 space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
        <h2 className="wrap-break-word text-lg font-semibold"><Link className="underline" to={`/app/goals/${goal.id}`}>{goal.title}</Link></h2>
        <p className="text-sm text-muted-foreground">{goal.category || 'Uncategorized'} · {label(goal.status)}</p>
        {goal.description && <p className="whitespace-pre-wrap wrap-break-word text-sm">{goal.description}</p>}
        {goal.target_date && <p className="text-sm">Target: {dateLabel(goal.target_date)}</p>}
        {goal.completed_at && <p className="text-sm">Completed <time dateTime={goal.completed_at}>{new Date(goal.completed_at).toLocaleDateString()}</time></p>}
        {goal.status === 'completed' && <div className="space-y-2"><h3 className="text-sm font-medium">Memories & reflections</h3>{memories.length ? <ul className="space-y-1">{memories.map((memory) => <li key={memory.id}><Link className="wrap-break-word text-sm underline" to={`/app/memories/${memory.id}`}>{memory.title}</Link></li>)}</ul> : <p className="text-sm text-muted-foreground">No linked memories yet.</p>}<Link className="text-sm underline" to={`/app/memories/new?goal=${goal.id}`}>Add a memory</Link></div>}
        <div className="flex flex-wrap gap-2">{goal.status !== 'completed' && <Button disabled={mutation.busy} onClick={() => void complete(goal.id)}>Complete<span className="sr-only"> {goal.title}</span></Button>}<Button variant="outline" render={<Link to={`/app/goals/${goal.id}/edit`} />}>Edit goal</Button><Button variant="outline" disabled={mutation.busy} onClick={() => void remove(goal.id)}>Remove from list<span className="sr-only">: {goal.title}</span></Button></div>
      </li>
    })}</ul>
  </>
}

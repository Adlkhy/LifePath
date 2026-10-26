import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLifeData } from '../hooks/use-life-data'
import { useResource } from '../hooks/use-resource'
import { useMutation } from '../hooks/use-mutation'
import { valuesRepository, type ValueInput } from '../repositories/values.repository'
import type { Goal, PersonalValue } from '../types/database'
import { PageHeading } from '../components/shared/PageHeading'
import { ResourceState } from '../components/shared/ResourceState'
import { EmptyState } from '../components/shared/EmptyState'
import { DeleteRecord } from '../components/shared/DeleteRecord'
import { Button } from '../components/ui/button'
import { Field, Input, Textarea } from '../components/ui/form-controls'

const loadValues = async () => {
  const [values, links] = await Promise.all([valuesRepository.listAll(), valuesRepository.listLinks()])
  return { values, links }
}

function ValueForm({ value, linkedIds, goals, onSaved, onCancel }: {
  value?: PersonalValue; linkedIds: string[]; goals: Goal[]; onSaved: () => void; onCancel: () => void
}) {
  const mutation = useMutation()
  const [input, setInput] = useState<ValueInput>({ name: value?.name ?? '', description: value?.description ?? '', guiding_principle: value?.guiding_principle ?? '', goal_ids: linkedIds })
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (await mutation.run(async () => {
      if (!input.name.trim()) throw new Error('Enter a value name.')
      await valuesRepository.save(value?.id ?? null, { ...input, name: input.name.trim(), description: input.description.trim(), guiding_principle: input.guiding_principle?.trim() || null })
    }, 'Value saved.')) onSaved()
  }
  return <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground" aria-label={value ? 'Edit value' : 'Create value'}>
    <h2 className="text-lg font-semibold">{value ? 'Edit value' : 'New value'}</h2>
    <fieldset disabled={mutation.busy} className="space-y-4">
      <legend className="sr-only">Value details</legend>
      <Field id="value-name" label="Name"><Input id="value-name" required maxLength={200} placeholder="Freedom" value={input.name} onChange={(e) => setInput({ ...input, name: e.target.value })} /></Field>
      <Field id="value-description" label="Description"><Textarea id="value-description" maxLength={20000} placeholder="I want control over my time and decisions." value={input.description} onChange={(e) => setInput({ ...input, description: e.target.value })} /></Field>
      <Field id="value-principle" label="Guiding principle (optional)"><Textarea id="value-principle" maxLength={20000} value={input.guiding_principle ?? ''} onChange={(e) => setInput({ ...input, guiding_principle: e.target.value })} /></Field>
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Connected visions and goals (optional)</legend>
        <div className="max-h-60 space-y-2 overflow-y-auto">{goals.filter((goal) => ['vision', 'goal'].includes(goal.type) || input.goal_ids.includes(goal.id)).map((goal) => <label key={goal.id} className="flex items-start gap-2 rounded-md border p-3 text-sm"><input type="checkbox" className="mt-1" checked={input.goal_ids.includes(goal.id)} onChange={(e) => setInput({ ...input, goal_ids: e.target.checked ? [...input.goal_ids, goal.id] : input.goal_ids.filter((id) => id !== goal.id) })} /><span className="wrap-break-word">{goal.title} · {goal.type}</span></label>)}</div>
        {!goals.some((goal) => ['vision', 'goal'].includes(goal.type)) && <p className="text-sm text-muted-foreground">Create a vision or goal to connect it here.</p>}
      </fieldset>
    </fieldset>
    {mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={mutation.busy}>{mutation.busy ? 'Saving…' : 'Save value'}</Button><Button variant="outline" disabled={mutation.busy} onClick={onCancel}>Cancel</Button></div>
  </form>
}

export function ValuesPage() {
  const { goals } = useLifeData()
  const resource = useResource(loadValues)
  const mutation = useMutation()
  const [editing, setEditing] = useState<string | null>(null)
  const values = resource.data?.values ?? []
  async function move(index: number, direction: number) {
    const ids = values.map((value) => value.id)
    ;[ids[index], ids[index + direction]] = [ids[index + direction], ids[index]]
    if (await mutation.run(() => valuesRepository.reorder(ids), 'Value order saved.')) resource.reload()
  }
  async function remove(id: string) {
    if (await mutation.run(() => valuesRepository.remove(id), 'Value deleted.')) resource.reload()
  }
  return <>
    <PageHeading title="Values & principles" description="What matters most to you. Values guide your choices; they are never tasks to complete."><Button disabled={!!editing || !resource.data || mutation.busy} onClick={() => setEditing('new')}>New value</Button></PageHeading>
    <ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />
    {mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}
    {editing && resource.data && <ValueForm key={editing} value={values.find((value) => value.id === editing)} linkedIds={resource.data.links.filter((link) => link.value_id === editing).map((link) => link.goal_id)} goals={goals} onSaved={() => { setEditing(null); resource.reload() }} onCancel={() => setEditing(null)} />}
    {resource.data && !values.length && !editing && <EmptyState>Start with one value, such as freedom, connection, or curiosity.</EmptyState>}
    <ol className="space-y-4">{values.map((value, index) => <li key={value.id} className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
      <h2 className="wrap-break-word text-xl font-semibold">{value.name}</h2>
      {value.description && <p className="whitespace-pre-wrap wrap-break-word">{value.description}</p>}
      {value.guiding_principle && <div><h3 className="text-sm font-medium">Guiding principle</h3><p className="whitespace-pre-wrap wrap-break-word text-sm text-muted-foreground">{value.guiding_principle}</p></div>}
      <ul className="flex flex-wrap gap-3">{resource.data?.links.filter((link) => link.value_id === value.id).map((link) => <li key={link.goal_id}><Link className="wrap-break-word text-sm underline" to={`/app/goals/${link.goal_id}`}>{goals.find((goal) => goal.id === link.goal_id)?.title ?? 'View goal'}</Link></li>)}</ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={mutation.busy || !!editing} onClick={() => setEditing(value.id)}>Edit<span className="sr-only"> {value.name}</span></Button>
        <Button variant="outline" disabled={mutation.busy || !!editing || index === 0} onClick={() => void move(index, -1)} aria-label={`Move ${value.name} up`}>Move up</Button>
        <Button variant="outline" disabled={mutation.busy || !!editing || index === values.length - 1} onClick={() => void move(index, 1)} aria-label={`Move ${value.name} down`}>Move down</Button>
        <DeleteRecord name="value" explanation="Connected goals and visions will remain." busy={mutation.busy || !!editing} error={mutation.error} onDelete={() => void remove(value.id)} />
      </div>
    </li>)}</ol>
  </>
}

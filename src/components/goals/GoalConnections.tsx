import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { ConnectionType, Goal } from '../../types/database'
import { useLifeData } from '../../hooks/use-life-data'
import { useMutation } from '../../hooks/use-mutation'
import { connectionsRepository } from '../../repositories/connections.repository'
import { connectionCandidates, connectionProblem } from '../../lib/lifepath'
import { Button } from '../ui/button'
import { Field, Select } from '../ui/form-controls'
import { ConfirmDialog } from '../shared/ConfirmDialog'

export function GoalConnections({ goal, inPlace = false }: { goal: Goal; inPlace?: boolean }) {
  const { goals, connections, putConnection, forgetConnection } = useLifeData()
  const [type, setType] = useState<ConnectionType>('prerequisite')
  const [selected, setSelected] = useState('')
  const [validation, setValidation] = useState<string | null>(null)
  const mutation = useMutation()
  const [removing, setRemoving] = useState<string | null>(null)
  const attached = connections.filter((edge) => edge.source_goal_id === goal.id || edge.target_goal_id === goal.id)
  const candidates = connectionCandidates(goal.id, type, goals, connections)
  async function add(event: FormEvent) {
    event.preventDefault()
    const problem = connectionProblem(selected, goal.id, type, connections)
    setValidation(problem)
    if (problem) return
    if (await mutation.run(async () => {
      const connection = await connectionsRepository.create({ source_goal_id: selected, target_goal_id: goal.id, connection_type: type })
      putConnection(connection)
    })) { setSelected('') }
  }
  async function remove(id: string) {
    setValidation(null)
    if (await mutation.run(() => connectionsRepository.remove(id), 'Connection removed.')) { setRemoving(null); forgetConnection(id) }
  }
  return <section className="space-y-4 rounded-lg border p-4" aria-labelledby="connections-heading">
    <h2 id="connections-heading" className="text-xl font-semibold">Connections</h2>
    <ConfirmDialog open={!!removing} onOpenChange={(open) => { if (!open) setRemoving(null) }} title="Remove connection?" description="The goals and their history will remain. Removing a prerequisite can make its dependent goal available." confirmLabel="Remove connection" busy={mutation.busy} onConfirm={() => { if (removing) void remove(removing) }}>{mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}</ConfirmDialog>
    <p className="text-sm text-muted-foreground">Prerequisites guide the order of your goals. Related connections link ideas without affecting availability.</p>
    {attached.length > 0 && <ul className="divide-y">{attached.map((edge) => {
      const otherId = edge.source_goal_id === goal.id ? edge.target_goal_id : edge.source_goal_id
      const other = goals.find((item) => item.id === otherId)
      const description = edge.connection_type === 'related' ? 'Related to' : edge.target_goal_id === goal.id ? 'Requires' : 'Required for'
      return <li key={edge.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-xs text-muted-foreground">{description}</p><Link className="wrap-break-word underline" to={`/app/goals/${otherId}`}>{other?.title ?? 'Unavailable goal'}</Link></div><Button variant="outline" disabled={mutation.busy} aria-label={`Remove ${description.toLowerCase()} ${other?.title ?? 'goal'} connection`} onClick={() => setRemoving(edge.id)}>Remove</Button></li>
    })}</ul>}
    <form onSubmit={add} className="space-y-3" aria-label="Add connection">
      <fieldset disabled={mutation.busy} className={`grid gap-3 ${inPlace ? '' : 'sm:grid-cols-2'}`}><legend className="sr-only">New connection</legend>
        <Field id="connection-type" label="Relationship"><Select id="connection-type" value={type} onChange={(event) => { setType(event.target.value as ConnectionType); setSelected(''); setValidation(null) }}><option value="prerequisite">This goal requires…</option><option value="related">This goal is related to…</option></Select></Field>
        <Field id="connection-goal" label="Other goal"><Select id="connection-goal" required value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">Choose a goal</option>{candidates.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></Field>
      </fieldset>
      {!candidates.length && <p className="text-sm text-muted-foreground">No valid goals to connect. Create another goal or choose another relationship.</p>}
      {(validation || mutation.error) && <p role="alert" className="text-destructive">{validation || mutation.error}</p>}
      <Button type="submit" disabled={mutation.busy || !selected}>{mutation.busy ? 'Saving…' : 'Add connection'}</Button>
    </form>
  </section>
}

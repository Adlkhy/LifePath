import { useCallback, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useResource } from '../../hooks/use-resource'
import { useMutation } from '../../hooks/use-mutation'
import { skillsRepository } from '../../repositories/skills.repository'
import { label } from '../../lib/lifepath'
import { ResourceState } from '../shared/ResourceState'
import { Field, Select } from '../ui/form-controls'
import { Button } from '../ui/button'

export function GoalSkills({ goalId }: { goalId: string }) {
  const load = useCallback(async () => {
    const [skills, links] = await Promise.all([skillsRepository.listAll(), skillsRepository.listLinks(goalId)])
    return { skills, links }
  }, [goalId])
  const resource = useResource(load)
  const mutation = useMutation()
  const [chosen, setChosen] = useState('')
  const linked = new Set(resource.data?.links.map((link) => link.skill_id))
  async function add(event: FormEvent) {
    event.preventDefault()
    if (chosen && await mutation.run(() => skillsRepository.link(chosen, goalId), 'Skill linked.')) { setChosen(''); resource.reload() }
  }
  return <section className="space-y-4" aria-labelledby="goal-skills-heading">
    <h2 id="goal-skills-heading" className="text-xl font-semibold">Relevant skills</h2>
    <p className="text-sm text-muted-foreground">Connect the abilities you are practicing. Proficiency stays self-assessed.</p>
    <ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />
    {mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}
    {resource.data && <>
      <ul className="space-y-2">{resource.data.skills.filter((skill) => linked.has(skill.id)).map((skill) => <li key={skill.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><Link className="wrap-break-word underline" to={`/app/skills?skill=${skill.id}`}>{skill.name} · {label(skill.level)}</Link><Button variant="outline" disabled={mutation.busy} aria-label={`Unlink ${skill.name}`} onClick={() => { void mutation.run(() => skillsRepository.unlink(skill.id, goalId), 'Skill unlinked.').then((ok) => { if (ok) resource.reload() }) }}>Unlink</Button></li>)}</ul>
      {!linked.size && <p className="text-sm text-muted-foreground">No skills linked yet.</p>}
      {resource.data.skills.some((skill) => !linked.has(skill.id)) && <form onSubmit={add} className="flex flex-wrap items-end gap-3"><Field id="goal-skill" label="Link a skill"><Select id="goal-skill" value={chosen} disabled={mutation.busy} onChange={(e) => setChosen(e.target.value)} required><option value="">Choose a skill</option>{resource.data.skills.filter((skill) => !linked.has(skill.id)).map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</Select></Field><Button type="submit" disabled={!chosen || mutation.busy}>Link skill</Button></form>}
      <Link className="text-sm underline" to="/app/skills">Manage skill trees</Link>
    </>}
  </section>
}

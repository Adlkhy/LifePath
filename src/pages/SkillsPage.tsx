import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useResource } from '../hooks/use-resource'
import { useMutation } from '../hooks/use-mutation'
import { useLifeData } from '../hooks/use-life-data'
import { skillsRepository } from '../repositories/skills.repository'
import { label } from '../lib/lifepath'
import { PageHeading } from '../components/shared/PageHeading'
import { ResourceState } from '../components/shared/ResourceState'
import { EmptyState } from '../components/shared/EmptyState'
import { DeleteRecord } from '../components/shared/DeleteRecord'
import { Button } from '../components/ui/button'
import { Field, Input, Select } from '../components/ui/form-controls'
import { SkillForm } from '../components/skills/SkillForm'
import { SkillTree } from '../components/skills/SkillTree'

const loadSkills = async () => {
  const [skills, links] = await Promise.all([skillsRepository.listAll(), skillsRepository.listLinks()])
  return { skills, links }
}
export function SkillsPage() {
  const { goals } = useLifeData()
  const resource = useResource(loadSkills)
  const mutation = useMutation()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('skill') ?? ''
  const [editing, setEditing] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [list, setList] = useState(false)
  const skills = useMemo(() => resource.data?.skills ?? [], [resource.data])
  const selected = skills.find((skill) => skill.id === selectedId)
  const matches = useMemo(() => skills.filter((skill) => (!category || skill.category === category) && skill.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [skills, category, search])
  const visible = useMemo(() => {
    const index = new Map(skills.map((skill) => [skill.id, skill]))
    const ids = new Set<string>()
    for (const match of matches) {
      let skill: typeof match | undefined = match
      while (skill && !ids.has(skill.id)) { ids.add(skill.id); skill = index.get(skill.parent_id ?? '') }
    }
    return skills.filter((skill) => ids.has(skill.id))
  }, [skills, matches])
  function select(id: string) { setParams(id ? { skill: id } : {}, { replace: true }) }
  return <>
    <PageHeading title="Skill trees" description="A map of what you are learning. Assess your proficiency as your experience grows."><Button disabled={!resource.data || !!editing} onClick={() => setEditing('new')}>New skill</Button></PageHeading>
    <ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />
    {mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}
    {editing && resource.data && <SkillForm key={editing} skill={skills.find((skill) => skill.id === editing)} skills={skills} goals={goals} linkedIds={resource.data.links.filter((link) => link.skill_id === editing).map((link) => link.goal_id)} onSaved={(id) => { setEditing(null); select(id); resource.reload() }} onCancel={() => setEditing(null)} />}
    {resource.data && !skills.length && !editing && <EmptyState>Add your first skill, then build a path from broad interests to specific abilities.</EmptyState>}
    {!!skills.length && <>
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Field id="skill-search" label="Search skills"><Input id="skill-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} /></Field>
        <Field id="skill-filter-category" label="Category"><Select id="skill-filter-category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{[...new Set(skills.map((skill) => skill.category).filter(Boolean))].map((name) => <option key={name} value={name!}>{name}</option>)}</Select></Field>
        <Button variant="outline" onClick={() => setList(!list)}>{list ? 'Tree view' : 'List view'}</Button>
      </div>
      {!matches.length ? <EmptyState>No skills match these filters.</EmptyState> : list ? <ul className="max-h-[640px] space-y-2 overflow-y-auto">{matches.map((skill) => <li key={skill.id}><button className="flex w-full flex-wrap justify-between gap-2 rounded-lg border bg-card p-4 text-left text-card-foreground focus-visible:outline-2 focus-visible:outline-ring" onClick={() => select(skill.id)} aria-pressed={skill.id === selectedId}><span className="wrap-break-word font-medium">{skill.name}</span><span>{label(skill.level)} · {skill.category || 'Uncategorized'}</span><span className="w-full text-sm text-muted-foreground">{skill.parent_id ? `Parent: ${skills.find((item) => item.id === skill.parent_id)?.name ?? 'Unknown'}` : 'Root skill'}</span></button></li>)}</ul> : <><p className="text-sm text-muted-foreground">Select a skill to view or edit. Pan and zoom to explore; filters include parent skills for context.</p><SkillTree key={`${category}:${search}:${skills.length}`} skills={visible} selected={selectedId} onSelect={select} /></>}
      {selected && <section className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground" aria-label="Selected skill">
        <div><h2 className="wrap-break-word text-xl font-semibold">{selected.name}</h2><p className="text-sm text-muted-foreground">{label(selected.level)} · Self-assessed · {selected.category || 'Uncategorized'}</p></div>
        {selected.notes && <p className="whitespace-pre-wrap wrap-break-word">{selected.notes}</p>}
        <div><h3 className="font-medium">Linked goals & milestones</h3><ul className="space-y-2">{resource.data?.links.filter((link) => link.skill_id === selected.id).map((link) => <li key={link.goal_id}><Link className="wrap-break-word underline" to={`/app/goals/${link.goal_id}`}>{goals.find((goal) => goal.id === link.goal_id)?.title ?? 'View goal'}</Link></li>)}</ul>{!resource.data?.links.some((link) => link.skill_id === selected.id) && <p className="text-sm text-muted-foreground">No goals linked yet. Edit this skill to add a connection.</p>}</div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!!editing || mutation.busy} onClick={() => setEditing(selected.id)}>Edit skill</Button><DeleteRecord key={selected.id} name="skill" explanation="Child skills become roots. Linked goals and milestones remain." busy={!!editing || mutation.busy} error={mutation.error} onDelete={() => { void mutation.run(() => skillsRepository.remove(selected.id), 'Skill deleted.').then((ok) => { if (ok) { select(''); resource.reload() } }) }} /></div>
      </section>}
    </>}
  </>
}

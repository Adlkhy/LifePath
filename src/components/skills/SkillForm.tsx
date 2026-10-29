import { useState, type FormEvent } from 'react'
import { useMutation } from '../../hooks/use-mutation'
import { skillsRepository, type SkillInput } from '../../repositories/skills.repository'
import { skillLevels, skillParentCandidates, skillParentProblem } from '../../lib/growth'
import { label } from '../../lib/lifepath'
import type { Goal, Skill } from '../../types/database'
import { Button } from '../ui/button'
import { Field, Input, Select, Textarea } from '../ui/form-controls'

export function SkillForm({ skill, skills, goals, linkedIds, onSaved, onCancel }: {
  skill?: Skill; skills: Skill[]; goals: Goal[]; linkedIds: string[]; onSaved: (id: string) => void; onCancel: () => void
}) {
  const mutation = useMutation()
  const [search, setSearch] = useState('')
  const [input, setInput] = useState<SkillInput>({ name: skill?.name ?? '', category: skill?.category ?? '', parent_id: skill?.parent_id ?? null, level: skill?.level ?? 'beginner', notes: skill?.notes ?? '', goal_ids: linkedIds })
  async function submit(event: FormEvent) {
    event.preventDefault()
    let savedId = ''
    if (await mutation.run(async () => {
      if (!input.name.trim()) throw new Error('Enter a skill name.')
      const problem = skillParentProblem(skill?.id ?? null, input.parent_id, skills)
      if (problem) throw new Error(problem)
      savedId = await skillsRepository.save(skill?.id ?? null, { ...input, name: input.name.trim(), category: input.category?.trim() || null, notes: input.notes?.trim() || null })
    }, 'Skill saved.')) onSaved(savedId)
  }
  return <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground" aria-label={skill ? 'Edit skill' : 'Create skill'}>
    <h2 className="text-xl font-semibold">{skill ? 'Edit skill' : 'New skill'}</h2>
    <fieldset disabled={mutation.busy} className="space-y-4">
      <legend className="sr-only">Skill details</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="skill-name" label="Name"><Input autoFocus id="skill-name" required maxLength={200} value={input.name} onChange={(e) => setInput({ ...input, name: e.target.value })} /></Field>
        <Field id="skill-category" label="Category (optional)"><Input id="skill-category" list="skill-categories" maxLength={200} placeholder="Programming, communication, fitness…" value={input.category ?? ''} onChange={(e) => setInput({ ...input, category: e.target.value })} /><datalist id="skill-categories">{[...new Set(skills.map((item) => item.category).filter(Boolean))].map((category) => <option key={category} value={category!} />)}</datalist></Field>
        <Field id="skill-parent" label="Parent skill"><Select id="skill-parent" value={input.parent_id ?? ''} onChange={(e) => setInput({ ...input, parent_id: e.target.value || null })}><option value="">No parent</option>{skillParentCandidates(skill?.id ?? null, skills).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
        <Field id="skill-level" label="Self-assessed proficiency"><Select id="skill-level" value={input.level} onChange={(e) => setInput({ ...input, level: e.target.value as SkillInput['level'] })}>{skillLevels.map((level) => <option key={level} value={level}>{label(level)}</option>)}</Select></Field>
      </div>
      <p className="text-sm text-muted-foreground">Choose the level that reflects your experience. Completing goals never changes it automatically.</p>
      <Field id="skill-notes" label="Notes or evidence (optional)"><Textarea id="skill-notes" maxLength={20000} placeholder="What have you learned? Record examples, feedback, or links to your work." value={input.notes ?? ''} onChange={(e) => setInput({ ...input, notes: e.target.value })} /></Field>
      <fieldset className="space-y-3"><legend className="mb-2 font-medium">Linked goals and milestones</legend>
        <Field id="skill-goal-search" label="Find a goal"><Input id="skill-goal-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} /></Field>
        <div className="max-h-60 space-y-2 overflow-y-auto">{goals.filter((goal) => goal.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map((goal) => <label key={goal.id} className="flex items-start gap-2 rounded-md border p-3 text-sm"><input className="mt-1" type="checkbox" checked={input.goal_ids.includes(goal.id)} onChange={(e) => setInput({ ...input, goal_ids: e.target.checked ? [...input.goal_ids, goal.id] : input.goal_ids.filter((id) => id !== goal.id) })} /><span className="wrap-break-word">{goal.title} · {label(goal.type)}</span></label>)}</div>
        <p className="text-sm text-muted-foreground">{input.goal_ids.length} linked. {!goals.length && 'Create a goal to link it here.'}</p>
      </fieldset>
    </fieldset>
    {mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={mutation.busy}>{mutation.busy ? 'Saving…' : 'Save skill'}</Button><Button variant="outline" disabled={mutation.busy} onClick={onCancel}>Cancel</Button></div>
  </form>
}

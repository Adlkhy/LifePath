import { useState, type FormEvent } from 'react'
import type { Chapter, Goal, GoalStatus, GoalType } from '../../types/database'
import type { CreateGoal } from '../../repositories/goals.repository'
import { goalStatuses, goalTypes, label, questDifficulties, validParent } from '../../lib/lifepath'
import { useMutation } from '../../hooks/use-mutation'
import { Button } from '../ui/button'
import { Field, Input, Select, Textarea } from '../ui/form-controls'

export function GoalForm({ goal, goals, chapters, initialChapterId = '', initialParentId = '', initialType = 'goal', onSave, onCancel }: {
  goal?: Goal; goals: Goal[]; chapters: Chapter[]; initialChapterId?: string; initialParentId?: string; initialType?: GoalType
  onSave: (input: CreateGoal) => Promise<void>; onCancel: () => void
}) {
  const [values, setValues] = useState({
    title: goal?.title ?? '', description: goal?.description ?? '', motivation: goal?.motivation ?? '',
    success_criteria: goal?.success_criteria ?? '', category: goal?.category ?? '',
    chapter_id: goal?.chapter_id ?? initialChapterId, parent_id: goal?.parent_id ?? initialParentId,
    type: goal?.type ?? initialType, status: goal?.status ?? 'planned',
    target_date: goal?.target_date ?? '', priority: goal?.priority?.toString() ?? '',
    difficulty: goal ? goal.difficulty ?? '' : 'medium',
  })
  const [validation, setValidation] = useState<string | null>(null)
  const mutation = useMutation()
  function change(name: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [name]: value,
      ...(name === 'type' && value === 'quest' && current.type !== 'quest' ? { difficulty: current.difficulty || 'medium' } : {}),
    }))
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    setValidation(null)
    if (!values.title.trim()) { setValidation('Enter a title.'); return }
    if (values.parent_id && !validParent(goal?.id ?? '', values.parent_id, goals)) { setValidation('Choose a parent outside this goal’s descendants.'); return }
    await mutation.run(() => onSave({ ...values, title: values.title.trim(),
      description: values.description.trim() || null, motivation: values.motivation.trim() || null,
      success_criteria: values.success_criteria.trim() || null, category: values.category.trim() || null,
      chapter_id: values.chapter_id || null, parent_id: values.parent_id || null,
      target_date: values.target_date || null, priority: values.priority ? Number(values.priority) : null,
      difficulty: values.type === 'quest' ? (questDifficulties.find((item) => item === values.difficulty) ?? null) : null,
    }))
  }
  return <form onSubmit={submit} className="max-w-3xl space-y-6" aria-label={goal ? 'Edit goal' : 'Create goal'}>
    <fieldset disabled={mutation.busy} className="space-y-4">
      <legend className="sr-only">Goal details</legend>
      <Field id="goal-title" label="Title"><Input id="goal-title" required maxLength={300} value={values.title} onChange={(event) => change('title', event.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="goal-type" label="Type"><Select id="goal-type" value={values.type} onChange={(event) => change('type', event.target.value as GoalType)}>{goalTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}</Select></Field>
        <Field id="goal-status" label="Status"><Select id="goal-status" value={values.status} onChange={(event) => change('status', event.target.value as GoalStatus)}>{goalStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</Select></Field>
      </div>
      {values.type === 'quest' && <Field id="quest-difficulty" label="Difficulty (optional)"><Select id="quest-difficulty" value={values.difficulty} onChange={(event) => change('difficulty', event.target.value)}><option value="">Not set</option>{questDifficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{label(difficulty)}</option>)}</Select></Field>}
      <Field id="goal-description" label="Description (optional)"><Textarea id="goal-description" value={values.description} onChange={(event) => change('description', event.target.value)} /></Field>
      <Field id="goal-motivation" label="Why this matters (optional)"><Textarea id="goal-motivation" value={values.motivation} onChange={(event) => change('motivation', event.target.value)} /></Field>
      <Field id="goal-success" label="Success criteria (optional)"><Textarea id="goal-success" value={values.success_criteria} onChange={(event) => change('success_criteria', event.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="goal-category" label="Category (optional)"><Input id="goal-category" value={values.category} onChange={(event) => change('category', event.target.value)} /></Field>
        <Field id="goal-priority" label="Priority (optional; 1 is highest)"><Input id="goal-priority" type="number" min={1} max={2147483647} step={1} value={values.priority} onChange={(event) => change('priority', event.target.value)} /></Field>
        <Field id="goal-chapter" label="Chapter"><Select id="goal-chapter" value={values.chapter_id} onChange={(event) => change('chapter_id', event.target.value)}><option value="">No chapter</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</Select></Field>
        <Field id="goal-parent" label="Parent goal"><Select id="goal-parent" value={values.parent_id} onChange={(event) => change('parent_id', event.target.value)}><option value="">No parent</option>{goals.filter((candidate) => validParent(goal?.id ?? '', candidate.id, goals)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title} ({label(candidate.type)})</option>)}</Select></Field>
        <Field id="goal-date" label="Deadline (optional)"><Input id="goal-date" type="date" value={values.target_date} onChange={(event) => change('target_date', event.target.value)} /></Field>
      </div>
    </fieldset>
    {(validation || mutation.error) && <p role="alert" className="text-destructive">{validation || mutation.error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={mutation.busy}>{mutation.busy ? 'Saving…' : goal ? 'Save changes' : 'Create goal'}</Button><Button variant="outline" disabled={mutation.busy} onClick={onCancel}>Cancel</Button></div>
  </form>
}

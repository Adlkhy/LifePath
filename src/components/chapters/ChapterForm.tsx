import { useState, type FormEvent } from 'react'
import type { Chapter, ChapterStatus } from '../../types/database'
import type { CreateChapter } from '../../repositories/chapters.repository'
import { chapterStatuses, label } from '../../lib/lifepath'
import { useMutation } from '../../hooks/use-mutation'
import { Button } from '../ui/button'
import { Field, Input, Select, Textarea } from '../ui/form-controls'

export function ChapterForm({ chapter, onSave, onCancel }: { chapter?: Chapter; onSave: (input: CreateChapter) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState(chapter?.title ?? '')
  const [description, setDescription] = useState(chapter?.description ?? '')
  const [status, setStatus] = useState<ChapterStatus>(chapter?.status ?? 'planned')
  const [start, setStart] = useState(chapter?.start_date ?? '')
  const [end, setEnd] = useState(chapter?.end_date ?? '')
  const [validation, setValidation] = useState<string | null>(null)
  const mutation = useMutation()
  async function submit(event: FormEvent) {
    event.preventDefault()
    setValidation(null)
    if (!title.trim()) { setValidation('Enter a title.'); return }
    if (start && end && end < start) { setValidation('End date must be on or after the start date.'); return }
    await mutation.run(() => onSave({ title: title.trim(), description: description.trim() || null, status, start_date: start || null, end_date: end || null }))
  }
  return <form onSubmit={submit} className="max-w-2xl space-y-6" aria-label={chapter ? 'Edit chapter' : 'Create chapter'}>
    <fieldset disabled={mutation.busy} className="space-y-4"><legend className="sr-only">Chapter details</legend>
      <Field id="chapter-title" label="Title"><Input id="chapter-title" required maxLength={300} value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
      <Field id="chapter-description" label="Description (optional)"><Textarea id="chapter-description" value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
      <Field id="chapter-status" label="Status"><Select id="chapter-status" value={status} onChange={(event) => setStatus(event.target.value as ChapterStatus)}>{chapterStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</Select></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field id="chapter-start" label="Start date (optional)"><Input id="chapter-start" type="date" value={start} onChange={(event) => setStart(event.target.value)} /></Field><Field id="chapter-end" label="End date (optional)"><Input id="chapter-end" type="date" value={end} min={start || undefined} onChange={(event) => setEnd(event.target.value)} /></Field></div>
    </fieldset>
    {(validation || mutation.error) && <p role="alert" className="text-destructive">{validation || mutation.error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={mutation.busy}>{mutation.busy ? 'Saving…' : chapter ? 'Save changes' : 'Create chapter'}</Button><Button variant="outline" disabled={mutation.busy} onClick={onCancel}>Cancel</Button></div>
  </form>
}

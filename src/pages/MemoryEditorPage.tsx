import { useCallback, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import { useLifeData } from '../hooks/use-life-data'
import { useMutation } from '../hooks/use-mutation'
import { useResource } from '../hooks/use-resource'
import { useFeedback } from '../state/feedback-context'
import { memoriesRepository, type MemoryInput } from '../repositories/memories.repository'
import { progressRepository } from '../repositories/progress.repository'
import { memoriesService } from '../services/memories.service'
import type { Memory, ProgressEvent } from '../types/database'
import { todayKey, eventTitle } from '../lib/lifepath'
import { validatePhoto } from '../lib/photo-validation'
import { errorMessage } from '../lib/data-error'
import { PageHeading } from '../components/shared/PageHeading'
import { ResourceState } from '../components/shared/ResourceState'
import { MemoryPhoto } from '../components/memories/MemoryPhoto'
import { Field, Input, Select, Textarea } from '../components/ui/form-controls'
import { Button } from '../components/ui/button'

function MemoryForm({ memory, events, params }: { memory?: Memory; events: ProgressEvent[]; params: URLSearchParams }) {
  const { goals, chapters } = useLifeData()
  const { session } = useAuth()
  const navigate = useNavigate()
  const mutation = useMutation()
  const notify = useFeedback()
  const initialEvent = events.find((event) => event.id === params.get('event'))
  const initialGoal = goals.find((goal) => goal.id === (params.get('goal') ?? initialEvent?.goal_id))
  const initialChapter = chapters.find((chapter) => chapter.id === (params.get('chapter') ?? initialEvent?.chapter_id ?? initialGoal?.chapter_id))
  const [values, setValues] = useState<MemoryInput>(() => ({
    title: memory?.title ?? '', description: memory?.description ?? '', kind: memory?.kind ?? (params.get('kind') === 'reflection' ? 'reflection' : 'memory'),
    memory_date: memory?.memory_date ?? todayKey(), goal_id: memory?.goal_id ?? initialGoal?.id ?? null,
    chapter_id: memory?.chapter_id ?? initialChapter?.id ?? null, event_id: memory?.event_id ?? initialEvent?.id ?? null,
    photo_path: memory?.photo_path ?? null,
  }))
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [checkingFile, setCheckingFile] = useState(false)
  const fileVersion = useRef(0)
  async function chooseFile(next: File | undefined) {
    const version = ++fileVersion.current
    setFile(null); setFileError(null)
    setCheckingFile(!!next)
    if (!next) return
    try { await validatePhoto(next); if (version === fileVersion.current) setFile(next) }
    catch (cause) { if (version === fileVersion.current) setFileError(errorMessage(cause)) }
    finally { if (version === fileVersion.current) setCheckingFile(false) }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!session || fileError || checkingFile) return
    await mutation.run(async () => {
      if (!values.title.trim()) throw new Error('Enter a title.')
      const { saved, warning } = await memoriesService.save({ ...values, title: values.title.trim(), description: values.description?.trim() || null }, session.user.id, file, memory)
      notify(warning ?? (saved.kind === 'reflection' ? 'Reflection saved.' : 'Memory saved.'))
      navigate(`/app/memories/${saved.id}`, { replace: true })
    }, false)
  }
  return <form className="max-w-3xl space-y-5" aria-label="Memory details" onSubmit={submit}>
    {values.kind === 'reflection' && <p className="text-sm text-muted-foreground">Reflections are optional and do not change completion status. You can return to this whenever you like.</p>}
    <fieldset disabled={mutation.busy} className="space-y-4"><legend className="sr-only">Memory details</legend>
      <Field id="memory-title" label="Title"><Input id="memory-title" required maxLength={300} value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} /></Field>
      <Field id="memory-description" label="Description or reflection"><Textarea id="memory-description" maxLength={20000} value={values.description ?? ''} onChange={(e) => setValues({ ...values, description: e.target.value })} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field id="memory-kind" label="Entry type"><Select id="memory-kind" value={values.kind} onChange={(e) => setValues({ ...values, kind: e.target.value as Memory['kind'] })}><option value="memory">Memory</option><option value="reflection">Reflection</option></Select></Field>
        <Field id="memory-date" label="Date"><Input id="memory-date" type="date" required value={values.memory_date} onChange={(e) => setValues({ ...values, memory_date: e.target.value })} /></Field>
        <Field id="memory-goal" label="Goal (optional)"><Select id="memory-goal" value={values.goal_id ?? ''} onChange={(e) => setValues({ ...values, goal_id: e.target.value || null, event_id: null, chapter_id: goals.find((goal) => goal.id === e.target.value)?.chapter_id ?? values.chapter_id })}><option value="">No goal</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</Select></Field>
        <Field id="memory-chapter" label="Life chapter (optional)"><Select id="memory-chapter" value={values.chapter_id ?? ''} onChange={(e) => setValues({ ...values, chapter_id: e.target.value || null })}><option value="">No chapter</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</Select></Field>
      </div>
      <Field id="memory-event" label="Achievement or journey event (optional)"><Select id="memory-event" value={values.event_id ?? ''} onChange={(e) => { const event = events.find((item) => item.id === e.target.value); setValues({ ...values, event_id: event?.id ?? null, goal_id: event?.goal_id ?? values.goal_id, chapter_id: event?.chapter_id ?? values.chapter_id }) }}><option value="">No event</option>{events.map((event) => <option key={event.id} value={event.id}>{eventTitle(event, goals)} · {new Date(event.created_at).toLocaleDateString()}</option>)}</Select></Field>
      <Field id="memory-photo" label="Photo (optional, JPEG / PNG / WebP, up to 5 MB)"><Input id="memory-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void chooseFile(e.target.files?.[0])} /></Field>
      {file && <p className="text-sm">Selected: {file.name}. Keep a separate backup of your photos.</p>}
      {memory?.photo_path && !file && <><MemoryPhoto key={memory.photo_path} path={memory.photo_path} title={memory.title} /><label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={values.photo_path === null} onChange={(e) => setValues({ ...values, photo_path: e.target.checked ? null : memory.photo_path })} />Remove this photo when saving</label></>}
    </fieldset>
    {(fileError || mutation.error) && <p role="alert" className="text-destructive">{fileError || mutation.error}</p>}
    <div className="flex gap-2"><Button type="submit" disabled={mutation.busy || !!fileError || checkingFile}>{mutation.busy ? 'Saving…' : checkingFile ? 'Checking photo…' : 'Save memory'}</Button><Button variant="outline" disabled={mutation.busy} render={<Link to={memory ? `/app/memories/${memory.id}` : '/app/journey'} />}>Cancel</Button></div>
  </form>
}
function Editor({ id, params }: { id?: string; params: URLSearchParams }) {
  const load = useCallback(async () => ({ memory: id ? await memoriesRepository.get(id) : undefined, events: await progressRepository.listAll() }), [id])
  const resource = useResource(load)
  return <><PageHeading title={id ? 'Edit memory' : params.get('kind') === 'reflection' ? 'Write a reflection' : 'Save a memory'} /><ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />{resource.data && <MemoryForm memory={resource.data.memory} events={resource.data.events} params={params} />}</>
}
export function MemoryEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  return <Editor key={id ?? params.toString()} id={id} params={params} />
}

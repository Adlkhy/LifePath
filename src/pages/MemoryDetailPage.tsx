import { useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useResource } from '../hooks/use-resource'
import { useMutation } from '../hooks/use-mutation'
import { useFeedback } from '../state/feedback-context'
import { memoriesRepository } from '../repositories/memories.repository'
import { memoriesService } from '../services/memories.service'
import { dateLabel, label } from '../lib/lifepath'
import { PageHeading } from '../components/shared/PageHeading'
import { ResourceState } from '../components/shared/ResourceState'
import { DeleteRecord } from '../components/shared/DeleteRecord'
import { MemoryPhoto } from '../components/memories/MemoryPhoto'
import { Button } from '../components/ui/button'

function Detail({ id }: { id: string }) {
  const resource = useResource(useCallback(() => memoriesRepository.get(id), [id]))
  const mutation = useMutation()
  const notify = useFeedback()
  const navigate = useNavigate()
  const memory = resource.data
  async function remove() {
    if (!memory) return
    await mutation.run(async () => { notify(await memoriesService.remove(memory)); navigate('/app/journey', { replace: true }) }, false)
  }
  return <><Link to="/app/journey" className="underline">Back to journey</Link><ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />{memory && <>
    <PageHeading title={memory.title} description={`${label(memory.kind)} · ${dateLabel(memory.memory_date)}`}><Button variant="outline" render={<Link to={`/app/memories/${id}/edit`} />}>Edit memory</Button></PageHeading>
    {memory.description && <p className="whitespace-pre-wrap wrap-break-word">{memory.description}</p>}
    {memory.photo_path && <MemoryPhoto key={memory.photo_path} path={memory.photo_path} title={memory.title} />}
    <nav aria-label="Memory attachments" className="flex flex-wrap gap-4 text-sm">{memory.goal_id && <Link className="underline" to={`/app/goals/${memory.goal_id}`}>View goal</Link>}{memory.chapter_id && <Link className="underline" to={`/app/chapters/${memory.chapter_id}`}>View chapter</Link>}{memory.event_id && <Link className="underline" to={`/app/journey/${memory.event_id}`}>View achievement</Link>}</nav>
    {memory.source_title && <p className="wrap-break-word text-sm text-muted-foreground">Saved in connection with: {memory.source_title}</p>}
    {mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}<DeleteRecord name="memory" explanation="Its photo will also be removed. The original goal and journey events remain." busy={mutation.busy} error={mutation.error} onDelete={() => void remove()} />
  </>}</>
}
export function MemoryDetailPage() { const { id } = useParams(); return <Detail key={id} id={id!} /> }

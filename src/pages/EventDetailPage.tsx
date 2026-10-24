import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { progressRepository } from '../repositories/progress.repository'
import { useResource } from '../hooks/use-resource'
import { useLifeData } from '../hooks/use-life-data'
import { eventTitle, label } from '../lib/lifepath'
import { PageHeading } from '../components/shared/PageHeading'
import { ResourceState } from '../components/shared/ResourceState'
import { MemorySection } from '../components/memories/MemorySection'
function Detail({ id }: { id: string }) {
  const { goals } = useLifeData()
  const resource = useResource(useCallback(() => progressRepository.get(id), [id]))
  const event = resource.data
  return <><Link to="/app/journey" className="underline">Back to journey</Link><ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />{event && <>
    <PageHeading title={eventTitle(event, goals)} description={label(event.event_type)} /><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
    <p className="text-sm text-muted-foreground">This is a saved moment in your history. Later changes do not replace it.</p>
    <nav className="flex flex-wrap gap-4" aria-label="Event attachments">{event.goal_id && <Link className="underline" to={`/app/goals/${event.goal_id}`}>View current goal</Link>}{event.chapter_id && <Link className="underline" to={`/app/chapters/${event.chapter_id}`}>View chapter</Link>}</nav>
    <MemorySection eventId={event.id} />
  </>}</>
}
export function EventDetailPage() { const { id } = useParams(); return <Detail key={id} id={id!} /> }

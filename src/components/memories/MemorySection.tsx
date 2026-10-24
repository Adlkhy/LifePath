import { Link } from 'react-router-dom'
import { memoriesRepository } from '../../repositories/memories.repository'
import { useResource } from '../../hooks/use-resource'
import { ResourceState } from '../shared/ResourceState'
import { MemoryList } from './MemoryList'
import { Button } from '../ui/button'
export function MemorySection({ goalId, chapterId, eventId }: { goalId?: string; chapterId?: string; eventId?: string }) {
  const resource = useResource(memoriesRepository.listAll)
  const query = goalId ? `goal=${goalId}` : eventId ? `event=${eventId}` : `chapter=${chapterId}`
  return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Memories & reflections</h2><Button variant="outline" render={<Link to={`/app/memories/new?${query}`} />}>Add a memory</Button></div><ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />{resource.data && <MemoryList memories={resource.data.filter((memory) => goalId ? memory.goal_id === goalId : eventId ? memory.event_id === eventId : memory.chapter_id === chapterId)} />}</section>
}

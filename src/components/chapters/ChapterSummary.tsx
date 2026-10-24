import { Link } from 'react-router-dom'
import { memoriesRepository } from '../../repositories/memories.repository'
import { progressRepository } from '../../repositories/progress.repository'
import { useResource } from '../../hooks/use-resource'
import { useLifeData } from '../../hooks/use-life-data'
import { eventTitle } from '../../lib/lifepath'
import { ResourceState } from '../shared/ResourceState'
import { MemoryList } from '../memories/MemoryList'
import { Button } from '../ui/button'
const loadSummary = async () => ({ memories: await memoriesRepository.listAll(), events: await progressRepository.listAll() })
export function ChapterSummary({ chapterId }: { chapterId: string }) {
  const { goals } = useLifeData()
  const resource = useResource(loadSummary)
  const goalIds = new Set(goals.filter((goal) => goal.chapter_id === chapterId).map((goal) => goal.id))
  const memories = resource.data?.memories.filter((memory) => memory.chapter_id === chapterId || (memory.goal_id && goalIds.has(memory.goal_id))) ?? []
  const achievements = resource.data?.events.filter((event) => event.chapter_id === chapterId && ['goal_completed', 'milestone_achieved'].includes(event.event_type)) ?? []
  return <section className="space-y-4 rounded-lg border p-4"><h2 className="text-xl font-semibold">Looking back</h2><p className="text-sm text-muted-foreground">A chapter can be complete even when some goals take a different path.</p><div className="flex flex-wrap gap-2"><Button variant="outline" render={<Link to={`/app/memories/new?chapter=${chapterId}`} />}>Add a memory</Button><Button variant="outline" render={<Link to={`/app/memories/new?chapter=${chapterId}&kind=reflection`} />}>Write a reflection</Button></div><ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />{resource.data && <>
    <h3 className="font-medium">Meaningful achievements ({achievements.length})</h3>{achievements.length ? <ul className="space-y-2">{achievements.map((event) => <li key={event.id}><Link className="wrap-break-word underline" to={`/app/journey/${event.id}`}>{eventTitle(event, goals)}</Link><span className="ml-2 text-xs text-muted-foreground">{new Date(event.created_at).toLocaleDateString()}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">No completed achievements recorded yet.</p>}
    <h3 className="font-medium">Memories & reflections ({memories.length})</h3><MemoryList memories={memories} />
  </>}</section>
}

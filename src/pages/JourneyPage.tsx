import { useState } from 'react'
import { Link } from 'react-router-dom'
import { progressRepository } from '../repositories/progress.repository'
import { memoriesRepository } from '../repositories/memories.repository'
import { useLifeData } from '../hooks/use-life-data'
import { useResource } from '../hooks/use-resource'
import { journeyEntries, groupJourney } from '../lib/journey'
import { label } from '../lib/lifepath'
import { PageHeading } from '../components/shared/PageHeading'
import { ResourceState } from '../components/shared/ResourceState'
import { EmptyState } from '../components/shared/EmptyState'
import { Button } from '../components/ui/button'
import { Field, Select } from '../components/ui/form-controls'

const loadJourney = async () => ({ events: await progressRepository.listAll(), memories: await memoriesRepository.listAll() })
export function JourneyPage() {
  const { goals, chapters } = useLifeData()
  const resource = useResource(loadJourney)
  const [chapter, setChapter] = useState('')
  const [type, setType] = useState('')
  const [period, setPeriod] = useState<'month' | 'year'>('month')
  const [oldest, setOldest] = useState(false)
  const [limit, setLimit] = useState(50)
  const entries = resource.data ? journeyEntries(resource.data.events, resource.data.memories, goals) : []
  const historicalChapters = [...new Set(entries.map((entry) => entry.chapterId).filter((id) => id && !chapters.some((item) => item.id === id)))]
  const filtered = entries.filter((entry) => (!chapter || (chapter === 'none' ? !entry.chapterId : entry.chapterId === chapter)) && (!type || entry.type === type))
  const visible = (oldest ? filtered.toReversed() : filtered).slice(0, limit)
  return <><PageHeading title="Your journey" description="Moments, achievements, and reflections worth keeping."><Button render={<Link to="/app/memories/new" />}>Add a memory</Button></PageHeading>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field id="journey-chapter" label="Chapter"><Select id="journey-chapter" value={chapter} onChange={(e) => { setChapter(e.target.value); setLimit(50) }}><option value="">All life</option><option value="none">No chapter</option>{chapters.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}{historicalChapters.map((id) => <option key={id} value={id!}>Past chapter ({id!.slice(0, 8)})</option>)}</Select></Field>
      <Field id="journey-type" label="Entry type"><Select id="journey-type" value={type} onChange={(e) => { setType(e.target.value); setLimit(50) }}><option value="">All entries</option><option value="memory">Memories</option><option value="reflection">Reflections</option><option value="progress">Progress & achievements</option><option value="chapter">Chapter transitions</option></Select></Field>
      <Field id="journey-group" label="Group by"><Select id="journey-group" value={period} onChange={(e) => setPeriod(e.target.value as 'month' | 'year')}><option value="month">Month</option><option value="year">Year</option></Select></Field>
      <Field id="journey-order" label="Order"><Select id="journey-order" value={oldest ? 'oldest' : 'newest'} onChange={(e) => { setOldest(e.target.value === 'oldest'); setLimit(50) }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></Select></Field>
    </div>
    <ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />
    {resource.data && !filtered.length && <EmptyState>No entries here yet. Save a memory or try another filter.</EmptyState>}
    {groupJourney(visible, period).map(([key, items]) => <section key={key} className="space-y-4"><h2 className="text-lg font-semibold">{period === 'year' ? key : new Date(`${key}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2><ol className="ml-2 space-y-4 border-l pl-4">{items.map((entry) => <li key={entry.id} className="space-y-2 rounded-lg border bg-card p-4 text-card-foreground"><p className="text-xs text-muted-foreground">{label(entry.type)} · <time dateTime={entry.date}>{new Date(entry.date).toLocaleDateString()}</time></p><h3 className="wrap-break-word font-medium"><Link className="underline" to={entry.href}>{entry.title}</Link></h3><p className="line-clamp-3 whitespace-pre-wrap wrap-break-word text-sm">{entry.description}</p></li>)}</ol></section>)}
    {filtered.length > limit && <Button variant="outline" onClick={() => setLimit(limit + 50)}>Show more entries</Button>}
  </>
}

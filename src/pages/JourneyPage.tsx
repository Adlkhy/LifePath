import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ProgressEvent } from '../types/database'
import { progressRepository } from '../repositories/progress.repository'
import { useLifeData } from '../hooks/use-life-data'
import { errorMessage } from '../lib/data-error'
import { eventTitle, label } from '../lib/lifepath'
import { PageHeading } from '../components/shared/PageHeading'
import { EmptyState } from '../components/shared/EmptyState'
import { Button } from '../components/ui/button'
import { Field, Select } from '../components/ui/form-controls'

const eventLabels: Record<string, string> = {
  goal_completed: 'Goal completed', goal_reopened: 'Goal reopened', goal_abandoned: 'Goal abandoned',
  milestone_achieved: 'Milestone achieved', chapter_started: 'Chapter started', chapter_completed: 'Chapter completed',
}

function JourneyFeed({ ascending }: { ascending: boolean }) {
  const { goals, chapters } = useLifeData()
  const [events, setEvents] = useState<ProgressEvent[]>([])
  const [offset, setOffset] = useState(0)
  const [nextOffset, setNextOffset] = useState(0)
  const [retry, setRetry] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void progressRepository.list({ offset, limit: 50, ascending }).then((page) => {
      if (!active) return
      setEvents((current) => {
        const known = new Set(current.map((event) => event.id))
        return [...current, ...page.filter((event) => !known.has(event.id))]
      })
      setHasMore(page.length > 0)
      setNextOffset(offset + page.length)
      setLoading(false)
      setError(null)
    }).catch((cause: unknown) => { if (active) { setError(errorMessage(cause)); setLoading(false) } })
    return () => { active = false }
  }, [offset, retry, ascending])
  return <>
    {!events.length && !loading && !error && <EmptyState>Your journey will appear here as you start chapters and complete, reopen, or abandon goals.</EmptyState>}
    <ol className="space-y-4">{events.map((event) => {
      const goalExists = event.goal_id && goals.some((goal) => goal.id === event.goal_id)
      const chapterExists = event.chapter_id && chapters.some((chapter) => chapter.id === event.chapter_id)
      const href = goalExists ? `/app/goals/${event.goal_id}` : chapterExists ? `/app/chapters/${event.chapter_id}` : null
      const title = eventTitle(event, goals)
      return <li key={event.id} className="space-y-2 rounded-lg border bg-card p-4 text-card-foreground">
        <p className="text-sm text-muted-foreground">{eventLabels[event.event_type] ?? label(event.event_type.replace(/^custom\./, ''))}</p>
        <h2 className="break-words font-semibold">{href ? <Link className="underline-offset-4 hover:underline" to={href}>{title}</Link> : title}</h2>
        <time dateTime={event.created_at} className="text-sm text-muted-foreground">{new Date(event.created_at).toLocaleString()}</time>
        {!href && <p className="text-xs text-muted-foreground">Saved in your journey</p>}
      </li>
    })}</ol>
    {loading && <p role="status">Loading your journey…</p>}
    {error && <div className="space-y-3"><p role="alert" className="text-destructive">{error}</p><Button onClick={() => { setLoading(true); setError(null); setRetry((value) => value + 1) }}>Try again</Button></div>}
    {!loading && !error && hasMore && <Button variant="outline" onClick={() => { setLoading(true); setOffset(nextOffset) }}>Load more events</Button>}
  </>
}

export function JourneyPage() {
  const [order, setOrder] = useState('newest')
  return <><PageHeading title="Your journey" description="A record of the steps you have taken." /><div className="max-w-xs"><Field id="journey-order" label="Order"><Select id="journey-order" value={order} onChange={(event) => setOrder(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></Select></Field></div><JourneyFeed key={order} ascending={order === 'oldest'} /></>
}

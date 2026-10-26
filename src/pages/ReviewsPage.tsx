import { useCallback, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLifeData } from '../hooks/use-life-data'
import { useLocalDay } from '../hooks/use-local-day'
import { useResource } from '../hooks/use-resource'
import { useMutation } from '../hooks/use-mutation'
import { reviewsRepository, type ReviewInput } from '../repositories/reviews.repository'
import { prioritiesRepository } from '../repositories/priorities.repository'
import { progressRepository } from '../repositories/progress.repository'
import type { GoalReview, ReviewPeriod } from '../types/database'
import { collectPages } from '../lib/pagination'
import { reviewPeriod, reviewSummary } from '../lib/intentional-living'
import { dateLabel, eventTitle, label } from '../lib/lifepath'
import { GoalList } from '../components/goals/GoalList'
import { PageHeading } from '../components/shared/PageHeading'
import { ResourceState } from '../components/shared/ResourceState'
import { EmptyState } from '../components/shared/EmptyState'
import { Button } from '../components/ui/button'
import { Field, Input, Select, Textarea } from '../components/ui/form-controls'

const questions = [
  ['went_well', 'What went well?'],
  ['didnt_go_as_planned', "What didn't go as planned?"],
  ['next_focus', 'What should I focus on next?'],
] as const

function ReviewEditor({ review, type, day, onSaved, onCancel }: {
  review?: GoalReview; type: ReviewPeriod; day: string; onSaved: () => void; onCancel: () => void
}) {
  const { goals } = useLifeData()
  const period = reviewPeriod(type, day)
  const { start, end } = period
  const loadSummary = useCallback(async () => {
    const range = reviewPeriod(type, day)
    const [events, priorities] = await Promise.all([
      collectPages((offset) => progressRepository.list({ from: range.fromTimestamp, until: range.toTimestamp, offset, limit: 100 })),
      prioritiesRepository.forPeriod(range.start, range.end),
    ])
    return { events, priorities }
  }, [type, day])
  const resource = useResource(loadSummary)
  const mutation = useMutation()
  const [input, setInput] = useState<ReviewInput>({ period_type: type, period_start: start, went_well: review?.went_well ?? '', didnt_go_as_planned: review?.didnt_go_as_planned ?? '', next_focus: review?.next_focus ?? '' })
  const summary = resource.data ? reviewSummary(resource.data.events, resource.data.priorities, goals, start, end) : null
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (await mutation.run(() => reviewsRepository.save(review?.id ?? null, input), 'Review saved.')) onSaved()
  }
  return <section className="space-y-6 rounded-lg border bg-card p-4 text-card-foreground" aria-labelledby="review-editor-heading">
    <div><h2 id="review-editor-heading" className="text-xl font-semibold">{review ? 'Edit' : 'New'} {type} review</h2><p className="text-sm text-muted-foreground">{dateLabel(start)} – {dateLabel(period.last)} · Answer as much or as little as you like.</p></div>
    <ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />
    {summary && <div className="space-y-5">
      <section className="space-y-2"><h3 className="font-semibold">Completed during this period</h3>{summary.completed.length ? <ul className="space-y-2">{summary.completed.map((event) => <li key={event.id} className="text-sm"><Link className="wrap-break-word underline" to={`/app/journey/${event.id}`}>{eventTitle(event, goals)}</Link> · {new Date(event.created_at).toLocaleDateString()}</li>)}</ul> : <p className="text-sm text-muted-foreground">No completions recorded in this period.</p>}</section>
      <section className="space-y-2"><h3 className="font-semibold">Unfinished priorities</h3><p className="text-sm text-muted-foreground">Goals selected in Daily Top 3 during this period, using their current status.</p><GoalList goals={summary.unfinished} empty="No unfinished priorities from this period." /></section>
    </div>}
    <form onSubmit={submit} className="space-y-4" aria-label="Review responses"><fieldset disabled={mutation.busy} className="space-y-4"><legend className="sr-only">Reflection questions</legend>{questions.map(([key, question]) => <Field key={key} id={`review-${key}`} label={question}><Textarea id={`review-${key}`} maxLength={20000} value={input[key]} onChange={(e) => setInput({ ...input, [key]: e.target.value })} /></Field>)}</fieldset>
      {mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={mutation.busy}>{mutation.busy ? 'Saving…' : 'Save review'}</Button><Button variant="outline" disabled={mutation.busy} onClick={onCancel}>Cancel</Button></div>
    </form>
  </section>
}

export function ReviewsPage() {
  const today = useLocalDay()
  const resource = useResource(reviewsRepository.listAll)
  const [type, setType] = useState<ReviewPeriod>('weekly')
  const [day, setDay] = useState(today)
  const [editing, setEditing] = useState<{ review?: GoalReview; type: ReviewPeriod; day: string } | null>(null)
  const [validation, setValidation] = useState<string | null>(null)
  function start(event: FormEvent) {
    event.preventDefault()
    if (!day || day > today) { setValidation('Choose today or an earlier date.'); return }
    setValidation(null)
    const period = reviewPeriod(type, day)
    const review = resource.data?.find((item) => item.period_type === type && item.period_start === period.start)
    setEditing({ review, type, day: period.start })
  }
  return <>
    <PageHeading title="Goal reviews" description="Pause, reflect, and choose what comes next. Reviews are optional; start one whenever it helps." />
    <ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />
    {resource.data && !editing && <form onSubmit={start} className="space-y-4 rounded-lg border p-4" aria-label="Choose review period">
      <div className="grid gap-4 sm:grid-cols-2"><Field id="review-type" label="Review period"><Select id="review-type" value={type} onChange={(e) => setType(e.target.value as ReviewPeriod)}><option value="weekly">Weekly (Monday–Sunday)</option><option value="monthly">Monthly</option></Select></Field><Field id="review-day" label="A date in the period"><Input id="review-day" type="date" required max={today} value={day} onChange={(e) => setDay(e.target.value)} /></Field></div>
      {validation && <p role="alert" className="text-destructive">{validation}</p>}
      <Button type="submit">Start or open review</Button>
    </form>}
    {editing && <ReviewEditor key={`${editing.type}:${editing.day}`} {...editing} onSaved={() => { setEditing(null); resource.reload() }} onCancel={() => setEditing(null)} />}
    {resource.data && <section className="space-y-4" aria-labelledby="previous-reviews"><h2 id="previous-reviews" className="text-xl font-semibold">Previous reviews</h2>
      {!resource.data.length && <EmptyState>No reviews yet. Start with a week or month you want to reflect on.</EmptyState>}
      {resource.data.map((review) => <article key={review.id} className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
        <h3 className="text-lg font-semibold">{label(review.period_type)} · {dateLabel(review.period_start)} – {dateLabel(reviewPeriod(review.period_type, review.period_start).last)}</h3>
        <p className="text-sm text-muted-foreground">Saved {new Date(review.created_at).toLocaleDateString()} · Updated {new Date(review.updated_at).toLocaleDateString()}</p>
        <dl className="space-y-3">{questions.map(([key, question]) => <div key={key}><dt className="text-sm font-medium">{question}</dt><dd className="whitespace-pre-wrap wrap-break-word text-sm text-muted-foreground">{review[key] || 'No response yet.'}</dd></div>)}</dl>
        <Button variant="outline" disabled={!!editing} onClick={() => setEditing({ review, type: review.period_type, day: review.period_start })}>Edit review<span className="sr-only"> for {dateLabel(review.period_start)}</span></Button>
      </article>)}
    </section>}
  </>
}

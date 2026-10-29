import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLifeData } from '../hooks/use-life-data'
import { useLocalDay } from '../hooks/use-local-day'
import { useResource } from '../hooks/use-resource'
import { progressRepository } from '../repositories/progress.repository'
import { activityWindow, goalStatistics, monthlyCompletions } from '../lib/growth'
import { goalStatuses, goalTypes, label, questDifficulties } from '../lib/lifepath'
import { PageHeading } from '../components/shared/PageHeading'
import { ResourceState } from '../components/shared/ResourceState'
import { EmptyState } from '../components/shared/EmptyState'
import { ActivityHeatmap } from '../components/insights/ActivityHeatmap'
import { GoalProgress } from '../components/goals/GoalProgress'
import { Button } from '../components/ui/button'

function CompletionHistory({ start, end, timezone }: { start: string; end: string; timezone: string }) {
  const load = useCallback(() => progressRepository.activity(start, end, timezone), [start, end, timezone])
  const resource = useResource(load)
  const months = monthlyCompletions(resource.data ?? [], start, end)
  const max = Math.max(1, ...months.map((month) => month.count))
  const total = months.reduce((sum, month) => sum + month.count, 0)
  return <div className="space-y-6">
    <ResourceState loading={resource.loading} error={resource.error} retry={resource.reload} />
    {resource.data && <>
      <section className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground"><h2 className="text-xl font-semibold">Progress activity</h2><p className="text-sm text-muted-foreground">First recorded completion of each goal, milestone, quest, vision, or chapter. Reopening and completing the same item again does not add another count. Edits and visits are excluded.</p><p className="text-xs text-muted-foreground">Calendar timezone: {timezone}. This is a record of your history, with no streak targets.</p><ActivityHeatmap key={`${start}:${end}`} activity={resource.data} start={start} end={end} /></section>
      <section className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground"><h2 className="text-xl font-semibold">Completed goals over time</h2><p className="text-sm text-muted-foreground">{total} unique first goal completions in this period, including visions, milestones, and quests. Chapters are excluded here. Deleted and reopened goals stay in this history. The first and last months may be partial.</p>
        {total === 0 ? <EmptyState>No goal completion history in this period. Choose another year or return after completing a goal.</EmptyState> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Monthly first completions and cumulative completions within the selected period</caption><thead><tr><th scope="col" className="py-2 pr-3">Month</th><th scope="col" className="py-2 pr-3">First completions</th><th scope="col" className="py-2">Period total</th></tr></thead><tbody>{months.map((month) => <tr key={month.month} className="border-t"><th scope="row" className="py-3 pr-3 font-normal whitespace-nowrap">{new Date(`${month.month}-01T12:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</th><td className="w-1/2 py-3 pr-3"><div className="flex items-center gap-2"><span className="w-7 shrink-0 tabular-nums">{month.count}</span><div className="h-3 flex-1 rounded-sm bg-muted" aria-hidden="true"><div className="h-full rounded-sm bg-primary" style={{ width: `${month.count / max * 100}%` }} /></div></div></td><td className="py-3 tabular-nums">{month.cumulative}</td></tr>)}</tbody></table></div>}
      </section>
    </>}
  </div>
}

export function InsightsPage() {
  const { goals } = useLifeData()
  const day = useLocalDay()
  const currentYear = Number(day.slice(0, 4))
  const [year, setYear] = useState<number | null>(null)
  const window = activityWindow(day, year)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const stats = goalStatistics(goals)
  const active = goals.filter((goal) => goal.status === 'active' && ['goal', 'milestone'].includes(goal.type))
  const quests = goals.filter((goal) => goal.type === 'quest')
  return <>
    <PageHeading title="Insights" description="Understand your direction and look back on meaningful progress." />
    <section className="space-y-4" aria-labelledby="current-insights"><h2 id="current-insights" className="text-xl font-semibold">Current goals</h2><p className="text-sm text-muted-foreground">Each stored vision, goal, milestone, or quest is counted once. Completion rate is currently completed items divided by all current items, including paused and abandoned items. Parent progress is not added to child counts.</p>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Total items', stats.total], ['Currently complete', stats.completed], ['Active items', stats.active], ['Completion rate', stats.rate === null ? '—' : `${stats.rate}%`]].map(([title, value]) => <div key={title} className="rounded-lg border bg-card p-4 text-card-foreground"><dt className="text-sm text-muted-foreground">{title}</dt><dd className="mt-2 text-3xl font-semibold">{value}</dd></div>)}</dl>
      {!goals.length ? <EmptyState>Create your first goal to see your current progress here. <Link className="underline" to="/app/goals/new">New goal</Link></EmptyState> : <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><caption className="sr-only">Current goals by type and status</caption><thead><tr><th scope="col" className="p-3">Type</th>{goalStatuses.map((status) => <th scope="col" className="p-3" key={status}>{label(status)}</th>)}<th scope="col" className="p-3">Total</th></tr></thead><tbody>{goalTypes.map((type) => <tr key={type} className="border-t"><th scope="row" className="p-3 font-medium">{label(type)}</th>{goalStatuses.map((status) => <td key={status} className="p-3 tabular-nums">{goals.filter((goal) => goal.type === type && goal.status === status).length}</td>)}<td className="p-3 tabular-nums">{goals.filter((goal) => goal.type === type).length}</td></tr>)}</tbody></table></div>}
    </section>
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground"><h2 className="text-xl font-semibold">Progress by life area</h2><p className="text-sm text-muted-foreground">Uses each goal’s stored category and current status.</p>{stats.categories.length ? <ul className="max-h-96 space-y-4 overflow-y-auto">{stats.categories.map((category) => <li key={category.name}><div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span className="wrap-break-word">{category.name}</span><span>{category.completed}/{category.total} complete</span></div><GoalProgress label={`${category.name} completion`} completed={category.completed} total={category.total} /></li>)}</ul> : <p className="text-sm text-muted-foreground">Categories appear when you add goals.</p>}</section>
      <section className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground"><h2 className="text-xl font-semibold">Quest difficulty</h2>{quests.length ? <ul className="space-y-4">{[...questDifficulties, 'unset'].map((difficulty) => {
        const count = quests.filter((quest) => (quest.difficulty ?? 'unset') === difficulty).length
        return <li key={difficulty}><div className="mb-2 flex justify-between text-sm"><span>{difficulty === 'unset' ? 'Not assessed' : label(difficulty)}</span><span>{count} of {quests.length}</span></div><GoalProgress label={`${difficulty} quests`} completed={count} total={quests.length} /></li>
      })}</ul> : <p className="text-sm text-muted-foreground">Add quests to see their difficulty distribution.</p>}</section>
    </div>
    <section className="space-y-4"><h2 className="text-xl font-semibold">Active goals & milestones</h2>{active.length ? <ul className="grid max-h-80 gap-3 overflow-y-auto sm:grid-cols-2">{active.map((goal) => <li key={goal.id} className="rounded-lg border p-3"><Link className="wrap-break-word underline" to={`/app/goals/${goal.id}`}>{goal.title}</Link><p className="text-xs text-muted-foreground">{label(goal.type)}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">No active goals or milestones right now.</p>}</section>
    <section className="space-y-4" aria-labelledby="history-heading"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="history-heading" className="text-xl font-semibold">{year === null ? 'Past 12 months' : `${year} history`}</h2><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={year !== null && year <= 1900} onClick={() => setYear((year ?? currentYear) - 1)}>Previous year</Button>{year !== null && <><Button variant="outline" onClick={() => setYear(year + 1 >= currentYear ? null : year + 1)}>Next year</Button><Button variant="outline" onClick={() => setYear(null)}>Past 12 months</Button></>}</div></div><CompletionHistory key={`${window.start}:${window.end}:${timezone}`} start={window.start} end={window.end} timezone={timezone} /></section>
  </>
}

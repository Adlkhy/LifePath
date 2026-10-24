import { Link } from 'react-router-dom'
import { useLifeData } from '../hooks/use-life-data'
import { useMutation } from '../hooks/use-mutation'
import { chaptersRepository } from '../repositories/chapters.repository'
import { dateLabel, label } from '../lib/lifepath'
import { Button } from '../components/ui/button'
import { PageHeading } from '../components/shared/PageHeading'
import { EmptyState } from '../components/shared/EmptyState'

export function ChaptersPage() {
  const { chapters, goals, refresh } = useLifeData()
  const mutation = useMutation()
  async function move(index: number, direction: number) {
    const order = chapters.map((chapter) => chapter.id)
    const other = index + direction
    if (other < 0 || other >= order.length) return
    ;[order[index], order[other]] = [order[other], order[index]]
    if (await mutation.run(() => chaptersRepository.reorder(order))) refresh()
  }
  return <>
    <PageHeading title="Life chapters" description="Make room for every season of your life."><Button render={<Link to="/app/chapters/new" />}>New chapter</Button></PageHeading>
    {mutation.error && <div className="space-y-2"><p role="alert" className="text-destructive">{mutation.error}</p><Button variant="outline" onClick={refresh}>Refresh chapters</Button></div>}
    {!chapters.length ? <EmptyState>Create your first chapter. Dates are optional, and several chapters can be active together.</EmptyState> : <ol className="space-y-3">{chapters.map((chapter, index) => {
      const associated = goals.filter((goal) => goal.chapter_id === chapter.id)
      return <li key={chapter.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4 text-card-foreground">
        <div className="min-w-0 flex-1 space-y-2"><p className="text-xs text-muted-foreground">{label(chapter.status)}</p><h2 className="wrap-break-word text-lg font-semibold"><Link className="hover:underline" to={`/app/chapters/${chapter.id}`}>{chapter.title}</Link></h2>{chapter.description && <p className="line-clamp-2 wrap-break-word text-sm text-muted-foreground">{chapter.description}</p>}<p className="text-sm">{associated.length} goals · {associated.filter((goal) => goal.status === 'completed').length} completed</p><p className="text-sm text-muted-foreground">{chapter.start_date ? dateLabel(chapter.start_date) : 'No start date'} · {chapter.end_date ? dateLabel(chapter.end_date) : 'No end date'}</p></div>
        <div className="flex gap-2"><Button variant="outline" aria-label={`Move ${chapter.title} up`} disabled={mutation.busy || index === 0} onClick={() => void move(index, -1)}>↑</Button><Button variant="outline" aria-label={`Move ${chapter.title} down`} disabled={mutation.busy || index === chapters.length - 1} onClick={() => void move(index, 1)}>↓</Button></div>
      </li>
    })}</ol>}
  </>
}

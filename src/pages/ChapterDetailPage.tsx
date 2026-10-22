import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLifeData } from '../hooks/use-life-data'
import { useMutation } from '../hooks/use-mutation'
import { chaptersRepository } from '../repositories/chapters.repository'
import { dateLabel, label } from '../lib/lifepath'
import { PageHeading } from '../components/shared/PageHeading'
import { DeleteRecord } from '../components/shared/DeleteRecord'
import { Button } from '../components/ui/button'
import { GoalList } from '../components/goals/GoalList'

export function ChapterDetailPage() {
  const { id } = useParams()
  const { chapters, goals, refresh } = useLifeData()
  const mutation = useMutation()
  const navigate = useNavigate()
  const chapter = chapters.find((item) => item.id === id)
  if (!chapter) return <p>Chapter not found. <Link to="/app/chapters" className="underline">Back to chapters</Link></p>
  async function remove() {
    if (await mutation.run(() => chaptersRepository.remove(chapter!.id))) { refresh(); navigate('/app/chapters', { replace: true }) }
  }
  return <>
    <Link className="text-sm underline" to="/app/chapters">All chapters</Link>
    <PageHeading title={chapter.title} description={label(chapter.status)}><Button variant="outline" render={<Link to={`/app/chapters/${chapter.id}/edit`} />}>Edit chapter</Button></PageHeading>
    {chapter.description && <p className="whitespace-pre-wrap break-words">{chapter.description}</p>}
    <p className="text-muted-foreground">{chapter.start_date ? `From ${dateLabel(chapter.start_date)}` : 'No start date'} · {chapter.end_date ? `Until ${dateLabel(chapter.end_date)}` : 'No end date'}</p>
    <section className="space-y-4" aria-labelledby="chapter-goals"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="chapter-goals" className="text-xl font-semibold">Goals in this chapter</h2><Button render={<Link to={`/app/goals/new?chapter=${chapter.id}`} />}>New goal</Button></div><GoalList goals={goals.filter((goal) => goal.chapter_id === chapter.id)} empty="This chapter has no goals yet." /></section>
    {mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}
    <DeleteRecord key={chapter.id} name="chapter" explanation="Its goals and journey history will remain." busy={mutation.busy} onDelete={() => void remove()} />
  </>
}

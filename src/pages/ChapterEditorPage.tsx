import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLifeData } from '../hooks/use-life-data'
import { chaptersRepository, type CreateChapter } from '../repositories/chapters.repository'
import { ChapterForm } from '../components/chapters/ChapterForm'
import { PageHeading } from '../components/shared/PageHeading'

export function ChapterEditorPage() {
  const { id } = useParams()
  const { chapters, refresh } = useLifeData()
  const navigate = useNavigate()
  const chapter = chapters.find((item) => item.id === id)
  if (id && !chapter) return <p>Chapter not found. <Link className="underline" to="/app/chapters">Back to chapters</Link></p>
  async function save(input: CreateChapter) {
    const saved = chapter ? await chaptersRepository.update(chapter.id, input) : await chaptersRepository.create({ ...input, sort_order: Math.max(-1, ...chapters.map((item) => item.sort_order)) + 1 })
    refresh()
    navigate(`/app/chapters/${saved.id}`, { replace: true })
  }
  return <><PageHeading title={chapter ? 'Edit chapter' : 'New chapter'} /><ChapterForm key={id ?? 'new'} chapter={chapter} onSave={save} onCancel={() => navigate(chapter ? `/app/chapters/${chapter.id}` : '/app/chapters')} /></>
}

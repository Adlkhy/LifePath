import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLifeData } from '../hooks/use-life-data'
import { goalsRepository, type CreateGoal } from '../repositories/goals.repository'
import { goalTypes } from '../lib/lifepath'
import type { GoalType } from '../types/database'
import { GoalForm } from '../components/goals/GoalForm'
import { PageHeading } from '../components/shared/PageHeading'

export function GoalEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { goals, chapters, refresh } = useLifeData()
  const navigate = useNavigate()
  const goal = goals.find((item) => item.id === id)
  if (id && !goal) return <p>Goal not found. <Link className="underline" to="/app/goals">Back to goals</Link></p>
  const parent = goals.find((item) => item.id === params.get('parent'))
  const chapter = chapters.find((item) => item.id === (params.get('chapter') ?? parent?.chapter_id))
  const type = goalTypes.includes(params.get('type') as GoalType) ? params.get('type') as GoalType : 'goal'
  async function save(input: CreateGoal) {
    const saved = goal ? await goalsRepository.update(goal.id, input) : await goalsRepository.create(input)
    refresh()
    navigate(`/app/goals/${saved.id}`, { replace: true })
  }
  return <><PageHeading title={goal ? 'Edit goal' : 'New goal'} /><GoalForm key={id ?? params.toString()} goal={goal} goals={goals} chapters={chapters} initialChapterId={chapter?.id} initialParentId={parent?.id} initialType={type} onSave={save} onCancel={() => navigate(goal ? `/app/goals/${goal.id}` : parent ? `/app/goals/${parent.id}` : '/app/goals')} /></>
}

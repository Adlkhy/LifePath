import type { QuestDifficulty } from '../../types/database'
import { label, questDifficulties } from '../../lib/lifepath'

export function DifficultyBadge({ difficulty }: { difficulty?: QuestDifficulty | null }) {
  if (!difficulty) return null
  const level = questDifficulties.indexOf(difficulty) + 1
  return <span className="inline-flex items-center gap-1.5 text-xs" aria-label={`Difficulty: ${label(difficulty)}`} title={`Quest difficulty: ${label(difficulty)}`}>
    <span aria-hidden="true" className="flex items-end gap-0.5">{questDifficulties.map((item, index) => <span key={item} className={`h-2 w-1 rounded-sm ${index < level ? 'bg-current' : 'border border-current opacity-30'}`} />)}</span>{label(difficulty)}
  </span>
}

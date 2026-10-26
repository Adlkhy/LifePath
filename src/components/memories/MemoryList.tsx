import { MotionCard } from '../ui/motion'
import { Link } from 'react-router-dom'
import type { Memory } from '../../types/database'
import { dateLabel, label } from '../../lib/lifepath'
export function MemoryList({ memories }: { memories: Memory[] }) {
  if (!memories.length) return <p className="text-sm text-muted-foreground">No memories or reflections yet. Save a moment you want to revisit.</p>
  return <ul className="grid gap-3 sm:grid-cols-2">{memories.map((memory) => <MotionCard as="li" key={memory.id} className="space-y-2 rounded-lg border bg-card p-4 text-card-foreground"><p className="text-xs text-muted-foreground">{label(memory.kind)} · {dateLabel(memory.memory_date)}{memory.photo_path ? ' · Photo' : ''}</p><Link className="wrap-break-word font-medium underline" to={`/app/memories/${memory.id}`}>{memory.title}</Link>{memory.description && <p className="line-clamp-3 whitespace-pre-wrap wrap-break-word text-sm">{memory.description}</p>}</MotionCard>)}</ul>
}

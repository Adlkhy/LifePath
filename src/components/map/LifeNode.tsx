import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Flag, Gem, Mountain, Sparkles } from 'lucide-react'
import type { GoalStatus, GoalType, QuestDifficulty } from '../../types/database'
import { label, progressionState } from '../../lib/lifepath'
import { useProgressionAnimation } from '../../hooks/use-progression-animation'
import { ProgressionBadge } from '../goals/ProgressionBadge'
import { DifficultyBadge } from '../goals/DifficultyBadge'
import { GoalProgress } from '../goals/GoalProgress'

export type LifeNodeData = {
  title: string; goalType: GoalType; status: GoalStatus; difficulty: QuestDifficulty | null
  completed: number; total: number; locked: number; unmetTitles: string
  neighbor: 'prerequisite' | 'dependent' | ''
}
export type LifeFlowNode = Node<LifeNodeData, 'life'>
const icons = { vision: Sparkles, goal: Mountain, milestone: Gem, quest: Flag }

export const LifeNode = memo(function LifeNode({ data, selected, isConnectable }: NodeProps<LifeFlowNode>) {
  const Icon = icons[data.goalType]
  const ref = useProgressionAnimation(data.status, data.locked, data.goalType)
  return <article ref={ref} className={`life-node life-node-${data.goalType} ${selected ? 'is-selected' : ''}`} data-status={data.status} data-progression={progressionState(data.status, data.locked)} data-neighbor={data.neighbor}>
    <Handle type="source" position={Position.Top} id="parent" isConnectable={false} style={{ left: '25%', visibility: 'hidden' }} />
    <Handle type="target" position={Position.Bottom} id="child" isConnectable={false} style={{ left: '25%', visibility: 'hidden' }} />
    <Handle type="source" position={Position.Top} id="out" isConnectable={isConnectable} aria-label="Connect from this goal" />
    <div className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2 font-medium"><Icon size={16} aria-hidden="true" />{label(data.goalType)}</span>{data.goalType === 'quest' && <DifficultyBadge difficulty={data.difficulty} />}</div>
    <p className="line-clamp-2 wrap-break-word text-base font-semibold" title={data.title}>{data.title}</p>
    <div><ProgressionBadge status={data.status} locked={data.locked} /></div>
    {data.locked > 0 && <p className="truncate text-xs" title={`Unmet prerequisites: ${data.unmetTitles}`}>Needs: {data.unmetTitles}</p>}
    {data.total > 0 && <div className="space-y-1"><p className="text-xs">{data.completed}/{data.total} steps complete</p><GoalProgress completed={data.completed} total={data.total} label={`${data.title} direct child completion`} /></div>}
    {data.neighbor && <p className="text-xs font-medium">{data.neighbor === 'prerequisite' ? 'Prerequisite of selected' : 'Depends on selected'}</p>}
    <Handle type="target" position={Position.Bottom} id="in" isConnectable={isConnectable} aria-label="Connect to this goal" />
  </article>
}, (previous, next) => previous.selected === next.selected && previous.isConnectable === next.isConnectable
  && (Object.keys(previous.data) as (keyof LifeNodeData)[]).every((key) => previous.data[key] === next.data[key]))

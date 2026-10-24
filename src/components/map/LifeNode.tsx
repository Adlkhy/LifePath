import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { CheckCircle2, Flag, Gem, LockKeyhole, Mountain, Sparkles } from 'lucide-react'
import type { GoalStatus, GoalType } from '../../types/database'
import { label } from '../../lib/lifepath'

export type LifeNodeData = {
  title: string; goalType: GoalType; status: GoalStatus
  completed: number; total: number; locked: number
}
export type LifeFlowNode = Node<LifeNodeData, 'life'>
const icons = { vision: Sparkles, goal: Mountain, milestone: Gem, quest: Flag }

export const LifeNode = memo(function LifeNode({ data, selected, isConnectable }: NodeProps<LifeFlowNode>) {
  const Icon = icons[data.goalType]
  const complete = data.status === 'completed'
  return <article className={`life-node life-node-${data.goalType} ${selected ? 'is-selected' : ''}`} data-status={data.status} data-locked={data.locked > 0 && !complete}>
    <Handle type="source" position={Position.Top} id="parent" isConnectable={false} style={{ left: '25%', visibility: 'hidden' }} />
    <Handle type="target" position={Position.Bottom} id="child" isConnectable={false} style={{ left: '25%', visibility: 'hidden' }} />
    <Handle type="source" position={Position.Top} id="out" isConnectable={isConnectable} aria-label="Connect from this goal" />
    <div className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2 font-medium"><Icon size={16} aria-hidden="true" />{label(data.goalType)}</span>{complete ? <CheckCircle2 size={18} aria-label="Completed" /> : data.locked > 0 ? <LockKeyhole size={16} aria-label="Unmet prerequisites" /> : null}</div>
    <p className="line-clamp-2 wrap-break-word text-base font-semibold" title={data.title}>{data.title}</p>
    <div className="flex items-center justify-between gap-2 text-xs"><span>{label(data.status)}</span>{data.locked > 0 && !complete && <span>Locked · {data.locked}</span>}</div>
    {data.total > 0 && <div className="space-y-1"><p className="text-xs">{data.completed}/{data.total} steps complete</p><progress className="h-1.5 w-full accent-primary" value={data.completed} max={data.total} aria-label={`${data.title} direct child completion`} /></div>}
    <Handle type="target" position={Position.Bottom} id="in" isConnectable={isConnectable} aria-label="Connect to this goal" />
  </article>
})

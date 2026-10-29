import { memo, useMemo } from 'react'
import dagre from 'dagre'
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, type Node, type NodeProps } from '@xyflow/react'
import type { Skill } from '../../types/database'
import { label } from '../../lib/lifepath'
import '@xyflow/react/dist/style.css'
import '../map/life-map.css'

type SkillNode = Node<{ name: string; level: string; category: string }, 'skill'>
const SkillNodeView = memo(function SkillNodeView({ data, selected }: NodeProps<SkillNode>) {
  return <div className={`h-[120px] w-[240px] space-y-2 rounded-lg border bg-card p-4 text-card-foreground ${selected ? 'outline-2 outline-offset-2 outline-ring' : ''}`}>
    <Handle type="target" position={Position.Top} isConnectable={false} className="invisible" />
    <p className="truncate text-xs text-muted-foreground">{data.category || 'Uncategorized'}</p>
    <p className="line-clamp-2 wrap-break-word font-semibold" title={data.name}>{data.name}</p>
    <p className="text-sm">{label(data.level)}</p>
    <Handle type="source" position={Position.Bottom} isConnectable={false} className="invisible" />
  </div>
})
const nodeTypes = { skill: SkillNodeView }

export function SkillTree({ skills, selected, onSelect }: { skills: Skill[]; selected: string; onSelect: (id: string) => void }) {
  const graph = useMemo(() => {
    const layout = new dagre.graphlib.Graph().setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 70 }).setDefaultEdgeLabel(() => ({}))
    const ids = new Set(skills.map((skill) => skill.id))
    for (const skill of skills) layout.setNode(skill.id, { width: 240, height: 120 })
    const edges = skills.filter((skill) => skill.parent_id && ids.has(skill.parent_id)).map((skill) => ({ id: `${skill.parent_id}:${skill.id}`, source: skill.parent_id!, target: skill.id, type: 'smoothstep' }))
    for (const edge of edges) layout.setEdge(edge.source, edge.target)
    dagre.layout(layout)
    return { nodes: skills.map((skill): SkillNode => ({ id: skill.id, type: 'skill', position: { x: layout.node(skill.id).x - 120, y: layout.node(skill.id).y - 60 }, data: { name: skill.name, level: skill.level, category: skill.category ?? '' }, ariaLabel: `${skill.name}, ${label(skill.level)}. Select to view or edit.` })), edges }
  }, [skills])
  return <div className="life-map h-[min(65vh,640px)] min-h-80 overflow-hidden rounded-lg border" role="region" aria-label="Interactive skill tree">
    <ReactFlow<SkillNode> nodes={graph.nodes.map((node) => ({ ...node, selected: node.id === selected }))} edges={graph.edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ maxZoom: 1, padding: 0.2 }} minZoom={0.05} maxZoom={1.5} zoomOnDoubleClick={false} nodesDraggable={false} nodesConnectable={false} edgesFocusable={false} deleteKeyCode={null} onlyRenderVisibleElements onNodeClick={(_, node) => onSelect(node.id)} onNodesChange={(changes) => {
      const selection = changes.find((change) => change.type === 'select' && change.selected)
      if (selection?.type === 'select' && selection.id !== selected) onSelect(selection.id)
      else if (!selection && changes.some((change) => change.type === 'select' && change.id === selected && !change.selected)) onSelect('')
    }} ariaLabelConfig={{ 'node.a11yDescription.default': 'Press Enter or Space to view skill details.' }}>
      <Background /><Controls showInteractive={false} fitViewOptions={{ maxZoom: 1, duration: 0 }} /><MiniMap pannable zoomable />
    </ReactFlow>
  </div>
}

import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Background, Controls, MarkerType, MiniMap, ReactFlow, type Connection, type Edge, type NodeChange, type ReactFlowInstance } from '@xyflow/react'
import { useLifeData } from '../hooks/use-life-data'
import { useMapPositions } from '../hooks/use-map-positions'
import { useMutation } from '../hooks/use-mutation'
import { connectionsRepository } from '../repositories/connections.repository'
import { connectionProblem, goalStatuses, goalTypes, label, progressionState, questDifficulties } from '../lib/lifepath'
import { filterMapGoals, layoutGoals, NODE_HEIGHT, NODE_WIDTH, type MapFilters, type MapPositions } from '../lib/life-map'
import type { ConnectionType } from '../types/database'
import { LifeNode, type LifeFlowNode, type LifeNodeData } from '../components/map/LifeNode'
import { MapGoalPanel } from '../components/map/MapGoalPanel'
import { PageHeading } from '../components/shared/PageHeading'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { GoalList } from '../components/goals/GoalList'
import { Button } from '../components/ui/button'
import { Field, Input, Select } from '../components/ui/form-controls'
import '@xyflow/react/dist/style.css'
import '../components/map/life-map.css'

const nodeTypes = { life: LifeNode }
const clearFilters: MapFilters = { type: '', status: '', chapter: '', search: '', difficulty: '' }
const fitOptions = { padding: 0.2, maxZoom: 1 }
const ariaLabels = {
  'node.a11yDescription.default': 'Press Enter or Space to select a goal and view details. Use arrow keys to move the selected goal. Press Escape to deselect.',
  'node.a11yDescription.keyboardDisabled': 'Press Enter or Space to select a goal and view details. Use arrow keys to move the selected goal. Press Escape to deselect.',
  'edge.a11yDescription.default': 'Press Enter or Space to select a connection. Use the selected connection panel to remove it, or Escape to deselect.',
}

export function LifeMapPage() {
  const { goals, chapters, connections, progression: feedback, putConnection, forgetConnection } = useLifeData()
  const placement = useMapPositions()
  const { setPositions, save } = placement
  const mutation = useMutation()
  const [flow, setFlow] = useState<ReactFlowInstance<LifeFlowNode> | null>(null)
  const [filters, setFilters] = useState<MapFilters>(clearFilters)
  const [selectedId, setSelectedId] = useState('')
  const [selectedEdgeId, setSelectedEdgeId] = useState('')
  const [minimap, setMinimap] = useState(true)
  const [list, setList] = useState(false)
  const [connectionType, setConnectionType] = useState<ConnectionType>('prerequisite')
  const [validation, setValidation] = useState<string | null>(null)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [removingConnection, setRemovingConnection] = useState<string | null>(null)
  const visibleGoals = useMemo(() => filterMapGoals(goals, filters), [goals, filters])
  const visibleIds = useMemo(() => new Set(visibleGoals.map((goal) => goal.id)), [visibleGoals])
  const activeSelection = visibleIds.has(selectedId) ? selectedId : ''
  const neighbors = useMemo(() => {
    const result = new Map<string, LifeNodeData['neighbor']>()
    const selected = feedback.get(activeSelection)
    for (const item of selected?.prerequisites ?? []) result.set(item.id, 'prerequisite')
    for (const item of selected?.dependents ?? []) result.set(item.id, 'dependent')
    return result
  }, [feedback, activeSelection])
  const nodeData = useMemo(() => new Map<string, LifeNodeData>(goals.map((goal) => {
    const info = feedback.get(goal.id)!
    return [goal.id, {
      title: goal.title, goalType: goal.type, status: goal.status, difficulty: goal.difficulty ?? null,
      completed: info.completed, total: info.total, locked: info.locked, unmetTitles: info.unmet.map((item) => item.title).join(', '), neighbor: neighbors.get(goal.id) ?? '',
    }]
  })), [goals, feedback, neighbors])
  const nodes = useMemo<LifeFlowNode[]>(() => goals.map((goal) => ({
    id: goal.id, type: 'life', position: placement.positions[goal.id],
    width: NODE_WIDTH, height: NODE_HEIGHT, data: nodeData.get(goal.id)!,
    hidden: !visibleIds.has(goal.id), selected: goal.id === selectedId,
    ariaLabel: `${label(goal.type)}: ${goal.title}, ${label(progressionState(goal.status, feedback.get(goal.id)!.locked))}${goal.difficulty ? `, ${label(goal.difficulty)} difficulty` : ''}${feedback.get(goal.id)!.locked ? `, needs ${nodeData.get(goal.id)!.unmetTitles}` : ''}. Press Enter to view details.`,
  })), [goals, placement.positions, nodeData, visibleIds, selectedId, feedback])
  const edges = useMemo<Edge[]>(() => {
    const byId = new Map(goals.map((goal) => [goal.id, goal]))
    const hierarchy: Edge[] = goals.filter((goal) => goal.parent_id && byId.has(goal.parent_id)).map((goal) => ({
      id: `parent:${goal.id}`, source: goal.id, target: goal.parent_id!, type: 'smoothstep', sourceHandle: 'parent', targetHandle: 'child',
      selected: selectedEdgeId === `parent:${goal.id}`,
      hidden: !visibleIds.has(goal.id) || !visibleIds.has(goal.parent_id!),
      label: 'Step of', ariaLabel: `${goal.title} is a step of ${byId.get(goal.parent_id!)!.title}`,
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--muted-foreground)' }, style: { strokeWidth: 1.5 },
      deletable: false,
    }))
    return [...hierarchy, ...connections.filter((edge) => byId.has(edge.source_goal_id) && byId.has(edge.target_goal_id)).map((edge): Edge => {
      const prerequisite = edge.connection_type === 'prerequisite'
      const source = byId.get(edge.source_goal_id)!
      const target = byId.get(edge.target_goal_id)!
      const neighbor = prerequisite && (source.id === activeSelection || target.id === activeSelection)
      const met = source.status === 'completed'
      return {
        id: edge.id, source: source.id, target: target.id, type: 'smoothstep', sourceHandle: 'out', targetHandle: 'in',
        hidden: !visibleIds.has(source.id) || !visibleIds.has(target.id), selected: edge.id === selectedEdgeId,
        label: prerequisite ? (met ? 'Prerequisite met' : 'Prerequisite') : 'Related',
        ariaLabel: prerequisite ? `${source.title} is required for ${target.title}` : `${source.title} is related to ${target.title}`,
        animated: false,
        markerEnd: { type: prerequisite ? MarkerType.ArrowClosed : MarkerType.Arrow, color: prerequisite ? 'var(--primary)' : 'var(--muted-foreground)' },
        markerStart: prerequisite ? undefined : { type: MarkerType.Arrow, color: 'var(--muted-foreground)' },
        style: { stroke: prerequisite ? 'var(--primary)' : 'var(--muted-foreground)', strokeWidth: neighbor ? 3.5 : prerequisite ? 2 : 1.5, strokeDasharray: prerequisite ? '8 4' : '2 6', opacity: activeSelection && !neighbor ? 0.35 : 1 },
      }
    })]
  }, [goals, connections, visibleIds, selectedEdgeId, activeSelection])

  const onNodesChange = useCallback((changes: NodeChange<LifeFlowNode>[]) => {
    const moved: MapPositions = {}
    const settled: MapPositions = {}
    for (const change of changes) {
      if (change.type === 'select') {
        setSelectedId((current) => change.selected ? change.id : current === change.id ? '' : current)
        if (change.selected) setSelectedEdgeId('')
      }
      if (change.type === 'position' && change.position) {
        moved[change.id] = change.position
        if (change.dragging !== true) settled[change.id] = change.position
      }
    }
    if (Object.keys(moved).length) setPositions((current) => ({ ...current, ...moved }))
    if (Object.keys(settled).length) save(settled)
  }, [setPositions, save])
  function focus(id: string) {
    setSelectedId(id); setSelectedEdgeId('')
    const point = placement.positions[id]
    if (point) void flow?.setCenter(point.x + NODE_WIDTH / 2, point.y + NODE_HEIGHT / 2, { zoom: 1 })
  }
  async function connect(connection: Connection) {
    const problem = connectionProblem(connection.source, connection.target, connectionType, connections)
    setValidation(problem)
    if (problem) return
    await mutation.run(async () => {
      putConnection(await connectionsRepository.create({ source_goal_id: connection.source, target_goal_id: connection.target, connection_type: connectionType }))
    })
  }
  function autoLayout(reset = false) {
    const positions = layoutGoals(goals, connections)
    placement.setPositions(positions)
    placement.save(positions, reset)
    setResetConfirm(false)
    // Let React Flow receive the new controlled positions before fitting.
    requestAnimationFrame(() => { void flow?.fitView(fitOptions) })
  }
  const selectedGoal = visibleGoals.find((goal) => goal.id === selectedId)
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId && !edge.hidden)
  const hiddenEdges = edges.filter((edge) => edge.hidden && (visibleIds.has(edge.source) || visibleIds.has(edge.target))).length
  async function removeConnection(id: string) {
    if (await mutation.run(() => connectionsRepository.remove(id), 'Connection removed.')) { forgetConnection(id); setSelectedEdgeId(''); setRemovingConnection(null) }
  }
  return <>
    <PageHeading title="Life Map" description="Explore the steps that connect your life goals."><Button variant="outline" render={<Link to="/app/goals/new" />}>Add a goal</Button></PageHeading>
    <ConfirmDialog open={!!removingConnection} onOpenChange={(open) => { if (!open) setRemovingConnection(null) }} title="Remove connection?" description="The goals and their history will remain. Removing a prerequisite can make its dependent goal available." confirmLabel="Remove connection" busy={mutation.busy} onConfirm={() => { if (removingConnection) void removeConnection(removingConnection) }}>{mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}</ConfirmDialog>
    {!goals.length ? <div className="space-y-3 rounded-lg border p-6"><h2 className="font-semibold">Your map starts with a goal</h2><p className="text-muted-foreground">Add a vision, goal, milestone, or quest. Your existing relationships will appear here.</p></div> : <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Map filters">
        <Field id="map-search" label="Search goals"><Input id="map-search" type="search" value={filters.search} placeholder="Search by title" onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></Field>
        <Field id="map-chapter" label="Life chapter"><Select id="map-chapter" value={filters.chapter} onChange={(event) => setFilters({ ...filters, chapter: event.target.value })}><option value="">All Life</option><option value="none">No chapter</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</Select></Field>
        <Field id="map-type" label="Type"><Select id="map-type" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value as MapFilters['type'] })}><option value="">All types</option>{goalTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}</Select></Field>
        <Field id="map-status" label="Status"><Select id="map-status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as MapFilters['status'] })}><option value="">All statuses</option>{goalStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</Select></Field>
        <Field id="map-difficulty" label="Quest difficulty"><Select id="map-difficulty" value={filters.difficulty} onChange={(event) => setFilters({ ...filters, difficulty: event.target.value as MapFilters['difficulty'] })}><option value="">All difficulties</option><option value="unset">Not set</option>{questDifficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{label(difficulty)}</option>)}</Select></Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" aria-pressed={list} onClick={() => setList(!list)}>{list ? 'Show map' : 'Show accessible list'}</Button>
        <Button variant="outline" onClick={() => setFilters(clearFilters)}>Clear filters</Button>
        {!list && <><Button variant="outline" onClick={() => void flow?.fitView(fitOptions)} disabled={!visibleGoals.length}>Fit to view</Button><Button variant="outline" aria-pressed={minimap} onClick={() => setMinimap(!minimap)}>Minimap</Button>
          <Button variant="outline" disabled={placement.saving} onClick={() => autoLayout()}>Auto-layout</Button><Button variant="outline" disabled={placement.saving} onClick={() => setResetConfirm(!resetConfirm)}>Reset layout</Button></>}
      </div>
      {resetConfirm && <div className="space-y-3 rounded-lg border p-4"><p>Reset saved positions for all {goals.length} goals, including goals hidden by filters? New layouts will follow your relationships automatically.</p><div className="flex gap-2"><Button disabled={placement.saving} onClick={() => autoLayout(true)}>Reset all positions</Button><Button variant="outline" onClick={() => setResetConfirm(false)}>Cancel</Button></div></div>}
      <p role="status" className="text-sm text-muted-foreground">{visibleGoals.length} of {goals.length} goals shown. {placement.saving ? 'Saving positions… Please wait before leaving.' : placement.error ? 'Some positions are not saved.' : 'Drag positions save automatically.'}{hiddenEdges > 0 && ` ${hiddenEdges} connections have an endpoint hidden by filters; prerequisites still apply.`}</p>
      {placement.error && <div role="alert" className="space-y-2"><p className="text-destructive">{placement.error} Keep this page open and retry to save your arrangement.</p><Button variant="outline" disabled={placement.saving} onClick={placement.retry}>Retry position saves</Button></div>}
      {(mutation.error || validation) && <p role="alert" className="text-destructive">{mutation.error || validation}</p>}
      <div className="grid items-end gap-3 sm:grid-cols-2">
        <Field id="map-focus" label="Select a goal"><Select id="map-focus" value={selectedGoal?.id ?? ''} onChange={(event) => focus(event.target.value)}><option value="">Choose a visible goal</option>{visibleGoals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</Select></Field>
        {!list && <div className="flex items-end gap-2"><div className="min-w-0 flex-1"><Field id="map-connect-type" label="New connection"><Select id="map-connect-type" value={connectionType} onChange={(event) => setConnectionType(event.target.value as ConnectionType)}><option value="prerequisite">Prerequisite</option><option value="related">Related</option></Select></Field></div><Button variant="outline" disabled={!selectedGoal} onClick={() => focus(selectedId)}>Focus selected</Button></div>}
      </div>
      {!visibleGoals.length && <p className="rounded-lg border p-6">No goals match these filters. Clear filters to see your full map.</p>}
      <div className={`grid items-start gap-4 ${!list ? 'lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]' : ''}`}>
      <div className="min-w-0">
      {list ? <GoalList goals={visibleGoals} /> : <>
        <p id="map-help" className="text-sm text-muted-foreground">Drag the canvas to pan; pinch or use +/− to zoom. Drag a top handle to a bottom handle to connect. Prerequisites point from the required goal to its dependent; related links do not affect availability. Select a goal to highlight its direct prerequisites and dependents. Auto-layout arranges and saves all goals.</p>
        <div className="life-map h-[65dvh] min-h-105 overflow-hidden rounded-lg border" aria-label="Interactive life map" aria-describedby="map-help">
          <ReactFlow<LifeFlowNode> nodes={nodes} edges={edges} nodeTypes={nodeTypes} onInit={setFlow} onNodesChange={onNodesChange}
            onNodeClick={(_event, node) => { setSelectedId(node.id); setSelectedEdgeId('') }}
            onEdgeClick={(_event, edge) => { setSelectedEdgeId(edge.id); setSelectedId('') }}
            onEdgesChange={(changes) => { for (const change of changes) if (change.type === 'select') {
              setSelectedEdgeId((current) => change.selected ? change.id : current === change.id ? '' : current)
              if (change.selected) setSelectedId('')
            } }}
            onConnect={(connection) => void connect(connection)}
            isValidConnection={(connection) => !connectionProblem(connection.source, connection.target, connectionType, connections)}
            nodesConnectable={!mutation.busy} deleteKeyCode={null} edgesReconnectable={false} ariaLabelConfig={ariaLabels}
            nodeExtent={[[-10000000, -10000000], [10000000, 10000000]]} minZoom={0.15} maxZoom={2}
            fitView fitViewOptions={fitOptions} multiSelectionKeyCode={null} selectionOnDrag={false} onlyRenderVisibleElements>
            <Background gap={24} />
            <Controls showInteractive={false} fitViewOptions={fitOptions} />
            {minimap && <MiniMap pannable zoomable ariaLabel="Life map overview" style={{ width: 140, height: 90 }} />}
          </ReactFlow>
        </div>
        <p className="flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Connection legend"><span>Solid arrow: child → parent</span><span>Dashed arrow: prerequisite → dependent</span><span>Dotted, two arrows: related</span><span>Dashed outline: prerequisite of selected</span><span>Dotted outline: dependent of selected</span></p>
      </>}
      {selectedEdge && <section className="space-y-3 rounded-lg border p-4" aria-label="Selected connection"><p>{selectedEdge.ariaLabel}</p>{selectedEdge.id.startsWith('parent:') ? <Button variant="outline" render={<Link to={`/app/goals/${selectedEdge.source}/edit`} />}>Edit parent relationship</Button> : <Button variant="outline" disabled={mutation.busy} onClick={() => setRemovingConnection(selectedEdge.id)}>Remove connection</Button>}<Button variant="outline" className="ml-2" onClick={() => setSelectedEdgeId('')}>Close</Button></section>}
      </div>
      {selectedGoal ? <aside className="min-w-0 lg:max-h-[75dvh] lg:overflow-y-auto" aria-label="Selected goal"><MapGoalPanel key={selectedGoal.id} goal={selectedGoal} onClose={() => setSelectedId('')} /></aside> : !list && <aside className="space-y-2 rounded-lg border p-4 text-sm text-muted-foreground"><p className="font-medium text-foreground">Explore a goal</p><p>Select a node or choose a goal above to view its progress, prerequisites, and connections.</p><p>Blocked goals remain viewable, editable, and can still be completed.</p></aside>}
      </div>
    </>}
  </>
}

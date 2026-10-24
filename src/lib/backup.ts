import { z } from 'zod'
const uuid = z.uuid().transform((value) => value.toLowerCase())
const nullableId = uuid.nullable()
const text = z.string().nullable()
const timestamp = z.iso.datetime({ offset: true })
const date = z.iso.date().nullable()
const title = z.string().trim().min(1)
const base = { id: uuid, created_at: timestamp }
const timestamps = { ...base, updated_at: timestamp }
const metadata = z.record(z.string(), z.json())
export const backupSchema = z.object({
  schema_version: z.literal(1), exported_at: timestamp,
  chapters: z.array(z.object({ ...timestamps, title, description: text, status: z.enum(['planned','active','completed','archived']), start_date: date, end_date: date, sort_order: z.number().int() }).strict().refine((chapter) => !chapter.start_date || !chapter.end_date || chapter.end_date >= chapter.start_date, 'Chapter end date precedes its start')),
  goals: z.array(z.object({ ...timestamps, title, chapter_id: nullableId, parent_id: nullableId, type: z.enum(['vision','goal','milestone','quest']), description: text, motivation: text, success_criteria: text, category: text, status: z.enum(['planned','active','completed','paused','abandoned']), priority: z.number().int().nullable(), target_date: date, completed_at: timestamp.nullable(), position_x: z.number().min(-10000000).max(10000000).nullable(), position_y: z.number().min(-10000000).max(10000000).nullable() }).strict().refine((goal) => (goal.status === 'completed') === (goal.completed_at !== null), 'Completion status and timestamp disagree').refine((goal) => (goal.position_x === null) === (goal.position_y === null), 'Coordinates must be a pair')),
  connections: z.array(z.object({ ...base, source_goal_id: uuid, target_goal_id: uuid, connection_type: z.enum(['prerequisite','related']) }).strict()),
  memories: z.array(z.object({ ...timestamps, goal_id: nullableId, chapter_id: nullableId, event_id: nullableId, kind: z.enum(['memory','reflection']), title: title.max(300), description: z.string().max(20000).nullable(), memory_date: z.iso.date(), source_title: z.string().max(1000).nullable(), has_photo: z.boolean() }).strict()),
  progress_events: z.array(z.object({ ...base, goal_id: nullableId, chapter_id: nullableId, event_type: title, metadata }).strict()),
}).strict()
export type Backup = z.infer<typeof backupSchema>
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024
export const backupKinds = ['chapters','goals','connections','memories','progress_events'] as const

function assertAcyclic(ids: Set<string>, edges: [string, string][]) {
  const incoming = new Map([...ids].map((id) => [id, 0]))
  const outgoing = new Map<string, string[]>()
  for (const [source, target] of edges) { incoming.set(target, incoming.get(target)! + 1); outgoing.set(source, [...(outgoing.get(source) ?? []), target]) }
  const queue = [...ids].filter((id) => incoming.get(id) === 0)
  for (let index = 0; index < queue.length; index++) for (const target of outgoing.get(queue[index]) ?? []) {
    incoming.set(target, incoming.get(target)! - 1)
    if (!incoming.get(target)) queue.push(target)
  }
  if (queue.length !== ids.size) throw new Error('Backup contains a circular goal hierarchy or prerequisite dependency.')
}
export function validateBackup(value: unknown): Backup {
  const parsed = backupSchema.safeParse(value)
  if (!parsed.success) throw new Error(`Invalid backup: ${parsed.error.issues[0].path.join('.')} — ${parsed.error.issues[0].message}`)
  const backup = parsed.data
  const total = backupKinds.reduce((sum, kind) => sum + backup[kind].length, 0)
  if (!total || total > 10000) throw new Error('Choose a backup containing between 1 and 10,000 records.')
  const sets = Object.fromEntries(backupKinds.map((kind) => [kind, new Set(backup[kind].map((record) => record.id))])) as Record<typeof backupKinds[number], Set<string>>
  for (const kind of backupKinds) if (sets[kind].size !== backup[kind].length) throw new Error(`Duplicate IDs in ${kind}.`)
  const reference = (kind: keyof typeof sets, id: string | null) => { if (id && !sets[kind].has(id)) throw new Error(`Backup references a missing ${kind} record.`) }
  for (const goal of backup.goals) { reference('chapters', goal.chapter_id); reference('goals', goal.parent_id) }
  for (const item of [...backup.memories, ...backup.progress_events]) { reference('chapters', item.chapter_id); reference('goals', item.goal_id) }
  for (const memory of backup.memories) reference('progress_events', memory.event_id)
  const connections = new Set<string>()
  for (const edge of backup.connections) {
    reference('goals', edge.source_goal_id); reference('goals', edge.target_goal_id)
    if (edge.source_goal_id === edge.target_goal_id) throw new Error('A connection cannot point to itself.')
    const pair = edge.connection_type === 'related' ? [edge.source_goal_id, edge.target_goal_id].sort() : [edge.source_goal_id, edge.target_goal_id]
    const key = `${edge.connection_type}:${pair.join(':')}`
    if (connections.has(key)) throw new Error('Duplicate connections in backup.')
    connections.add(key)
  }
  assertAcyclic(sets.goals, backup.goals.filter((goal) => goal.parent_id).map((goal) => [goal.id, goal.parent_id!]))
  assertAcyclic(sets.goals, backup.connections.filter((edge) => edge.connection_type === 'prerequisite').map((edge) => [edge.source_goal_id, edge.target_goal_id]))
  return backup
}

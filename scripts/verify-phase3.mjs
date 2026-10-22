import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

async function loadPureModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
const { childProgress, connectionProblem, validParent, focusItems, eventTitle, todayKey } = await loadPureModule('../src/lib/lifepath.ts')
const { collectPages } = await loadPureModule('../src/lib/pagination.ts')
const goal = (id, fields = {}) => ({ id, title: id, type: 'goal', status: 'planned', parent_id: null, target_date: null, priority: null, ...fields })
const edge = (source_goal_id, target_goal_id, connection_type = 'prerequisite') => ({ source_goal_id, target_goal_id, connection_type })

test('progress counts direct children, including unfinished children, without counting grandchildren', () => {
  assert.deepEqual(childProgress('root', [goal('a', { parent_id: 'root', status: 'completed' }), goal('b', { parent_id: 'root', status: 'abandoned' }), goal('c', { parent_id: 'a', status: 'completed' })]), { total: 2, completed: 1 })
  assert.deepEqual(childProgress('empty', []), { total: 0, completed: 0 })
})
test('parent selection rejects self, descendants, missing parents and existing cycles', () => {
  const goals = [goal('a'), goal('b', { parent_id: 'a' }), goal('c', { parent_id: 'b' })]
  assert.equal(validParent('a', 'a', goals), false)
  assert.equal(validParent('a', 'c', goals), false)
  assert.equal(validParent('a', 'unknown', goals), false)
  assert.equal(validParent('c', 'a', goals), true)
  assert.equal(validParent('new', 'a', [goal('a', { parent_id: 'b' }), goal('b', { parent_id: 'a' })]), false)
})
test('connections reject self links, duplicates, reverse related duplicates and transitive cycles', () => {
  const edges = [edge('a', 'b'), edge('b', 'c'), edge('c', 'd', 'related')]
  assert.ok(connectionProblem('a', 'a', 'related', edges))
  assert.ok(connectionProblem('a', 'b', 'prerequisite', edges))
  assert.ok(connectionProblem('d', 'c', 'related', edges))
  assert.ok(connectionProblem('c', 'a', 'prerequisite', edges))
  assert.equal(connectionProblem('c', 'a', 'related', edges), null)
  assert.equal(connectionProblem('d', 'a', 'prerequisite', edges), null)
})
test('available quests require all prerequisites completed and exclude paused, completed and abandoned quests', () => {
  const goals = [goal('done', { status: 'completed' }), goal('waiting'),
    ...['ready', 'blocked', 'paused', 'completed', 'abandoned'].map((id) => goal(id, { type: 'quest', status: ['paused', 'completed', 'abandoned'].includes(id) ? id : 'active' }))]
  const focus = focusItems(goals, [edge('done', 'ready'), edge('done', 'blocked'), edge('waiting', 'blocked')])
  assert.deepEqual(focus.available.map((item) => item.id), ['ready'])
  assert.deepEqual(focus.blocked.map((item) => item.id), ['blocked'])
})
test('reopening a prerequisite makes its quest unavailable again', () => {
  const goals = [goal('parent', { status: 'active' }), goal('quest', { type: 'quest' })]
  assert.equal(focusItems(goals, [edge('parent', 'quest')]).available.length, 0)
  goals[0].status = 'completed'
  assert.equal(focusItems(goals, [edge('parent', 'quest')]).available.length, 1)
})
test('focus ranks by priority then deadline and includes overdue plus the 30-day boundary', () => {
  const now = new Date(2026, 9, 22, 0, 5)
  assert.equal(todayKey(now), '2026-10-22')
  const goals = [goal('overdue', { target_date: '2026-10-21' }), goal('boundary', { target_date: '2026-11-21' }), goal('later', { target_date: '2026-11-22' }), goal('done', { target_date: '2026-10-22', status: 'completed' }), goal('no-date'), goal('q2', { type: 'quest', priority: 2 }), goal('q1', { type: 'quest', priority: 1 })]
  const focus = focusItems(goals, [], now)
  assert.deepEqual(focus.available.map((item) => item.id), ['q1', 'q2'])
  assert.deepEqual(focus.deadlines.map((item) => item.id), ['overdue', 'boundary'])
})
test('history uses the original snapshot after a goal is renamed or deleted', () => {
  const event = { metadata: { title: 'Original title' }, goal_id: 'a' }
  assert.equal(eventTitle(event, [goal('a', { title: 'Renamed' })]), 'Original title')
  assert.equal(eventTitle({ ...event, goal_id: null }, []), 'Original title')
})
test('collection loads beyond a server page cap and propagates errors', async () => {
  const source = Array.from({ length: 153 }, (_, index) => index)
  assert.deepEqual(await collectPages(async (offset) => source.slice(offset, offset + 37)), source)
  await assert.rejects(collectPages(async () => { throw new Error('offline') }), /offline/)
})

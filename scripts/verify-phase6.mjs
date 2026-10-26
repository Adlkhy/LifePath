// Isolated PostgreSQL verification; never connects to a Supabase project.
// npm install --prefix .phase6-check.local --no-save --no-package-lock @electric-sql/pglite
// node scripts/verify-phase6.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { PGlite } from '../.phase6-check.local/node_modules/@electric-sql/pglite/dist/index.js'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = async (name) => ts.transpileModule(await readFile(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText
const dataUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const lifepathUrl = dataUrl(await source('lifepath'))
const { todayKey } = await import(lifepathUrl)
const { reviewPeriod, reviewSummary } = await import(dataUrl((await source('intentional-living')).replace("'./lifepath'", JSON.stringify(lifepathUrl))))

assert.equal(todayKey(new Date(2026, 9, 26, 0, 5)), '2026-10-26')
assert.equal(reviewPeriod('weekly', '2026-11-01').start, '2026-10-26')
assert.equal(reviewPeriod('weekly', '2026-11-01').end, '2026-11-02')
assert.equal(reviewPeriod('monthly', '2024-02-29').last, '2024-02-29')
assert.equal(reviewPeriod('monthly', '2026-12-31').end, '2027-01-01')
assert.equal(reviewPeriod('weekly', '2027-01-01').start, '2026-12-28')
const summary = reviewSummary([
  { id: 'before', event_type: 'goal_completed', created_at: new Date(2026, 9, 25, 23, 59).toISOString() },
  { id: 'during', event_type: 'goal_completed', created_at: new Date(2026, 9, 26, 0, 1).toISOString() },
  { id: 'after', event_type: 'milestone_achieved', created_at: new Date(2026, 10, 2, 0, 0).toISOString() },
  { id: 'other', event_type: 'goal_reopened', created_at: new Date(2026, 9, 27).toISOString() },
], [
  { goal_id: 'a', priority_date: '2026-10-26' }, { goal_id: 'a', priority_date: '2026-10-27' },
  { goal_id: 'b', priority_date: '2026-10-26' }, { goal_id: 'c', priority_date: '2026-10-25' },
], [{ id: 'a', status: 'active' }, { id: 'b', status: 'completed' }, { id: 'c', status: 'planned' }], '2026-10-26', '2026-11-02')
assert.deepEqual(summary.completed.map((event) => event.id), ['during'])
assert.deepEqual(summary.unfinished.map((goal) => goal.id), ['a'])
console.log('PASS local dates, week/month boundaries, history filtering, priority deduplication')

let db = new PGlite()
const alice = '00000000-0000-4000-8000-000000000001'
const bob = '00000000-0000-4000-8000-000000000002'
const query = async (sql, params = []) => (await db.query(sql, params)).rows
const scalar = async (sql, params = []) => Object.values((await query(sql, params))[0])[0]
const reject = async (sql, params, code) => assert.rejects(() => db.query(sql, params), (error) => error.code === code)
const signIn = async (id) => {
  await db.exec('reset role; set role authenticated;')
  await query("select set_config('request.jwt.claim.sub', $1, false)", [id])
}
try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `)
  for (const name of ['20261021000100_backend_foundation.sql', '20261026000100_intentional_living.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'))
  }
  await query('insert into auth.users(id) values ($1), ($2)', [alice, bob])
  await signIn(bob)
  const foreignGoal = await scalar("insert into public.goals(title) values ('Private goal') returning id")
  await signIn(alice)
  const goal = await scalar("insert into public.goals(title) values ('Learn to sail') returning id")
  const quest = await scalar("insert into public.goals(title, type) values ('Book a lesson', 'quest') returning id")
  const vision = await scalar("insert into public.goals(title, type) values ('Live freely', 'vision') returning id")
  const extra = await scalar("insert into public.goals(title) values ('Visit Kyoto') returning id")
  const value = await scalar("select public.save_personal_value(null, 'Freedom', 'My time and decisions', 'Choose deliberately', $1)", [[goal, vision]])
  const secondValue = await scalar("select public.save_personal_value(null, 'Curiosity', '', null, '{}')")
  assert.equal(await scalar('select count(*)::int from public.value_goals'), 2)
  await query("select public.save_personal_value($1, 'Freedom edited', 'Updated', null, $2)", [value, [goal]])
  assert.equal(await scalar('select name from public.personal_values where id = $1', [value]), 'Freedom edited')
  assert.equal(await scalar('select count(*)::int from public.value_goals'), 1)
  await query('select public.reorder_values($1)', [[secondValue, value]])
  assert.deepEqual((await query('select id from public.personal_values order by sort_order')).map((row) => row.id), [secondValue, value])
  await reject('select public.reorder_values($1)', [[value, value]], '22023')
  await reject("select public.save_personal_value($1, 'Bad edit', '', null, $2)", [value, [foreignGoal]], '22023')
  assert.equal(await scalar('select name from public.personal_values where id = $1', [value]), 'Freedom edited')
  assert.equal(await scalar('select count(*)::int from public.value_goals'), 1)
  console.log('PASS values create/read/edit/reorder and atomic rollback')

  await query('insert into public.bucket_list_items(goal_id) values ($1)', [goal])
  await reject('insert into public.bucket_list_items(goal_id) values ($1)', [goal], '23505')
  const experience = await scalar("select public.create_bucket_experience('See auroras', 'A winter trip', 'Travel', '2027-02-01')")
  assert.equal(await scalar('select count(*)::int from public.goals where id = $1', [experience]), 1)
  assert.equal(await scalar('select target_date::text from public.goals where id = $1', [experience]), '2027-02-01')
  await query("update public.goals set status = 'completed' where id = $1", [experience])
  assert.ok(await scalar('select completed_at from public.goals where id = $1', [experience]))
  assert.equal(await scalar("select count(*)::int from public.progress_events where goal_id = $1 and event_type = 'goal_completed'", [experience]), 1)
  await query('delete from public.bucket_list_items where goal_id = $1', [goal])
  assert.equal(await scalar('select count(*)::int from public.goals where id = $1', [goal]), 1)
  console.log('PASS bucket membership uniqueness, goal reuse, completion history and removal')

  await query("select public.set_daily_priorities('2026-10-25', $1)", [[goal, quest]])
  assert.equal(await scalar("select count(*)::int from public.daily_priorities where priority_date = '2026-10-26'"), 0)
  await query("select public.set_daily_priorities('2026-10-26', $1)", [[goal, quest, extra]])
  await reject("select public.set_daily_priorities('2026-10-26', $1)", [[goal, quest, extra, experience]], '22023')
  await reject("select public.set_daily_priorities('2026-10-26', $1)", [[goal, goal]], '22023')
  await reject("select public.set_daily_priorities('2026-10-26', $1)", [[vision]], '22023')
  await reject("select public.set_daily_priorities('2026-10-26', $1)", [[foreignGoal]], '22023')
  await reject("insert into public.daily_priorities(priority_date, slot, goal_id) values ('2026-10-26', 4, $1)", [experience], '23514')
  assert.equal(await scalar("select count(*)::int from public.daily_priorities where priority_date = '2026-10-26'"), 3)
  await query("select public.set_daily_priorities('2026-10-26', $1)", [[extra, quest, goal]])
  assert.deepEqual((await query("select goal_id from public.daily_priorities where priority_date = '2026-10-26' order by slot")).map((row) => row.goal_id), [extra, quest, goal])
  await query("select public.set_daily_priorities('2026-10-26', $1)", [[experience]])
  assert.equal(await scalar("select count(*)::int from public.daily_priorities where priority_date = '2026-10-25'"), 2)
  await query("select public.set_daily_priorities('2026-10-26', '{}')")
  assert.equal(await scalar("select count(*)::int from public.daily_priorities where priority_date = '2026-10-26'"), 0)
  console.log('PASS priority limits, duplicates, replacement, reorder, removal and previous-day retention')

  const review = await scalar("insert into public.goal_reviews(period_type, period_start, went_well) values ('weekly', '2026-10-26', 'Made time for sailing') returning id")
  await query("update public.goal_reviews set next_focus = 'Practice' where id = $1", [review])
  assert.equal(await scalar('select next_focus from public.goal_reviews where id = $1', [review]), 'Practice')
  await query("insert into public.goal_reviews(period_type, period_start) values ('monthly', '2026-10-01')")
  await reject("insert into public.goal_reviews(period_type, period_start) values ('weekly', '2026-10-26')", [], '23505')
  await reject("insert into public.goal_reviews(period_type, period_start) values ('weekly', '2026-10-27')", [], '23514')
  await reject("insert into public.goal_reviews(period_type, period_start) values ('monthly', '2026-10-26')", [], '23514')
  console.log('PASS weekly/monthly review persistence, editing, uniqueness and dates')

  const tables = ['personal_values', 'value_goals', 'bucket_list_items', 'daily_priorities', 'goal_reviews']
  await signIn(bob)
  for (const table of tables) {
    assert.equal(await scalar(`select count(*)::int from public.${table}`), 0)
    assert.equal((await query(`delete from public.${table} returning *`)).length, 0)
  }
  assert.equal((await query("update public.personal_values set name = 'Stolen' where id = $1 returning id", [value])).length, 0)
  assert.equal((await query("update public.goal_reviews set next_focus = 'Stolen' where id = $1 returning id", [review])).length, 0)
  await reject("select public.save_personal_value($1, 'Stolen', '', null, '{}')", [value], '42501')
  await reject("insert into public.personal_values(user_id, name) values ($1, 'Spoof')", [alice], '42501')
  await reject("insert into public.goal_reviews(user_id, period_type, period_start) values ($1, 'weekly', '2026-10-26')", [alice], '42501')
  await reject('insert into public.bucket_list_items(goal_id) values ($1)', [goal], '23503')
  await reject('insert into public.bucket_list_items(user_id, goal_id) values ($1, $2)', [alice, goal], '42501')
  await reject("insert into public.daily_priorities(priority_date, slot, goal_id) values ('2026-10-26', 1, $1)", [goal], '23503')
  await reject('insert into public.value_goals(value_id, goal_id) values ($1, $2)', [value, foreignGoal], '23503')
  await reject('select public.reorder_values($1)', [[value]], '22023')
  await query("insert into public.goal_reviews(period_type, period_start) values ('weekly', '2026-10-26')")
  await signIn(alice)
  await reject('update public.personal_values set user_id = $1 where id = $2', [bob, value], '23514')
  assert.equal(await scalar('select count(*)::int from public.goal_reviews'), 2)
  await db.exec('reset role; set role anon;')
  for (const table of tables) await reject(`select * from public.${table}`, [], '42501')
  await reject("select public.set_daily_priorities('2026-10-26', '{}')", [], '42501')
  await reject("select public.create_bucket_experience('No', null, null, null)", [], '42501')
  console.log('PASS two-user RLS, ownership spoofing, cross-user references and anonymous access')

  await signIn(alice)
  await query('delete from public.personal_values where id = $1', [value])
  assert.equal(await scalar('select count(*)::int from public.value_goals'), 0)
  assert.equal(await scalar('select count(*)::int from public.goals where id = $1', [goal]), 1)
  await query('delete from public.goals where id = $1', [experience])
  assert.equal(await scalar('select count(*)::int from public.bucket_list_items'), 0)
  assert.equal(await scalar("select count(*)::int from public.progress_events where event_type = 'goal_completed'"), 1)
  await db.exec('reset role;')
  const dump = await db.dumpDataDir('none')
  await db.close()
  db = new PGlite({ loadDataDir: dump })
  await signIn(alice)
  assert.equal(await scalar('select next_focus from public.goal_reviews where id = $1', [review]), 'Practice')
  assert.equal(await scalar("select count(*)::int from public.daily_priorities where priority_date = '2026-10-25'"), 2)
  assert.equal(await scalar('select name from public.personal_values where id = $1', [secondValue]), 'Curiosity')
  console.log('PASS deletion cleanup and database restart persistence')
  console.log('Phase 6 verification passed.')
} finally {
  await db.close()
}

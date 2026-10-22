// Optional isolated PostgreSQL verification; does not add app dependencies.
// npm install --prefix "$env:TEMP/lifepath-db-verification" --ignore-scripts @electric-sql/pglite
// node scripts/verify-database.mjs
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const runtime = process.env.PGLITE_MODULE || join(tmpdir(), 'lifepath-db-verification/node_modules/@electric-sql/pglite/dist/index.js')
const { PGlite } = await import(pathToFileURL(runtime).href)
const db = new PGlite()
try {
  // Minimal Auth contract only; this does not emulate GoTrue or PostgREST.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('00000000-0000-4000-8000-000000000009', 'existing@example.test');
  `)
  const migration = await readFile(new URL('../supabase/migrations/20261021000100_backend_foundation.sql', import.meta.url), 'utf8')
  await db.exec(migration)
  await db.exec(await readFile(new URL('../supabase/migrations/20261022000100_reorder_chapters.sql', import.meta.url), 'utf8'))
  const backfill = await db.query("select count(*)::int as count from public.profiles where id = '00000000-0000-4000-8000-000000000009'")
  if (backfill.rows[0].count !== 1) throw new Error('Existing user profile backfill failed')
  const sql = await readFile(new URL('../supabase/tests/backend_foundation.sql', import.meta.url), 'utf8')
  const results = await db.exec(sql)
  const assertions = results.flatMap((result) => result.rows).filter((row) => row.ok === true).length
  console.log(`PASS: migration, existing-user backfill, and ${assertions} database assertions.`)
  const phase3 = await db.exec(await readFile(new URL('../supabase/tests/chapter_reordering.sql', import.meta.url), 'utf8'))
  console.log(`PASS: ${phase3.flatMap((result) => result.rows).filter((row) => row.ok === true).length} chapter reordering assertions.`)
  console.log('Scope: embedded PostgreSQL with Auth roles/uid stub; no hosted Auth, HTTP API, or multi-connection concurrency verification.')
} finally {
  await db.close()
}

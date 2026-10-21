# Lifepath backend foundation

## Existing architecture and scope

The audited app used React 19, TypeScript 6, Vite 8, Tailwind 4, the React Compiler, and a custom tweakcn theme. `src/main.tsx` mounted `App.tsx`, which contained a single “Hello” section. There were no routes, domain types, auth provider, repositories, UI component files, environment files, or migrations. Supabase JS, its CLI, React Router, Zod, and Zustand were already installed. No dependencies were installed into or changed in the application.

The existing entry point and home content remain. Auth is added inside `App.tsx` using the installed router. New UI uses the existing CSS tokens and radius utilities; no shadcn components existed to reuse. `components.json`, every TypeScript/Vite configuration, package files, and `src/index.css` are untouched. The existing `*.local` ignore rule covers `.env.local`.

This checkout did not contain a `.git` directory when audited. The SQL files are ready to commit when the project is added to your existing version-control workflow; no repository was initialized.

## Configure the frontend

The supplied project URL and **publishable** key are already set in local `.env.local`. The committed example contains placeholders only:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
```

For another checkout, copy `.env.example` to `.env.local`, replace both placeholders with values from your project's Connect dialog, and restart `npm run dev`. Put the same two variables into your deployment platform's build environment. BrowserRouter hosting requires an SPA fallback to `index.html` for `/app`, `/sign-in`, `/sign-up`, and `/auth/callback`.

The singleton client validates missing/placeholder configuration and accepts the current `sb_publishable_` key format. Secret/service-role and legacy JWT keys are deliberately rejected by this frontend configuration. Publishable keys are expected to be visible in the built browser bundle; they are not privileged credentials. RLS authorizes data access using the signed-in user's JWT. Never put a database password, service-role JWT, or `sb_secret_` key in a `VITE_` variable.

## Apply the migration

Migration: `supabase/migrations/20261021000100_backend_foundation.sql`. It is transactional and intended to run **once**, as the database migration owner, against a Supabase PostgreSQL 15+ database.

The migration has **not been applied to the hosted project**. A read-only check of the supplied project confirmed the public key works and email signup is enabled (Auth settings HTTP 200); querying the goals endpoint returned `PGRST205` (table missing from the schema cache). A public key cannot run database DDL.

Use one of these deployment methods:

1. With authenticated Supabase CLI access, run `npx supabase login`, `npx supabase link --project-ref vfzmnnfbooavpnmlsozd`, `npx supabase db push --dry-run`, then `npx supabase db push`. Review the dry run before applying. The project has a minimal Supabase configuration; do not reinitialize the Vite app.
2. Alternatively, paste the complete migration into the correct project's SQL Editor and execute as the database owner. If you later adopt CLI migrations, reconcile the migration-history entry before pushing this same migration again (`supabase migration repair`, after verifying the deployed schema).

In hosted **Authentication → URL Configuration**, set the Site URL to your app origin and allow exact `/auth/callback` URLs for development and production. For the default local server these are `http://localhost:5173/auth/callback` and, if used, `http://127.0.0.1:5173/auth/callback`. Add your chosen alternate port if Vite uses one. In Auth's email/password settings, keep confirmation enabled and require at least eight characters. The local `supabase/config.toml` settings do not automatically change the hosted Auth settings.

The client uses PKCE and the SDK's callback detection. Email confirmation should be opened in the same browser that started signup, so its PKCE verifier is available. If a link is expired or opened in another browser, sign in after confirming or restart signup to obtain a fresh confirmation link. Production email delivery/SMTP is configured in Supabase separately.

After deployment, regenerate the raw schema contract with `npx supabase gen types typescript --linked --schema public`. Keep application-facing aliases and input types (currently in `src/types/database.ts` and repositories) alongside the generated contract, and rerun TypeScript checks. The current contract is hand-maintained against this migration, not presented as CLI-generated output.

## Database behavior

| Table | Purpose and integrity |
| --- | --- |
| `profiles` | One profile per Auth user; private display name, avatar URL, object preferences. Created automatically on signup; existing users are backfilled. |
| `chapters` | Planned/active/completed/archived life periods. Optional dates; end cannot precede start. Multiple active chapters are allowed. |
| `goals` | Vision/goal/milestone/quest records. Optional chapter, parent, priority and deadline. Same-owner composite foreign keys and parent-cycle rejection. |
| `goal_connections` | Directed prerequisites and undirected related links. No self-links or duplicates, including reversed related links. Endpoints must share the owner. Prerequisite cycles rejected on insert and update. |
| `progress_events` | Append-only history for clients. Optional same-owner goal/chapter references, JSON object metadata, server-stamped creation time. |

All primary keys are UUIDs; all timestamps use `timestamptz`. User-owned rows default their owner to `auth.uid()`. IDs, ownership and creation timestamps are immutable after insertion. Mutable profile/chapter/goal rows receive automatic `updated_at`; connections and history only have `created_at`. Status/date/title/JSON constraints and ownership/query indexes are included.

`source_goal_id → target_goal_id` means the source is a prerequisite **of** the target. Cycle checks use recursive traversal. A real write to the owner's profile row serializes graph additions and parent changes. This prevents write skew across concurrent changes; at repeatable-read/serializable isolation a stale writer must abort/retry. Profile `updated_at` can therefore also advance on graph changes. Concurrent operations can return serialization/deadlock errors; retry the whole failed transaction after reloading current state. Separate connections are still needed to verify this on the deployment database.

Completing a goal sets `completed_at` and creates `goal_completed`, or `milestone_achieved` for milestones. Leaving completed status clears that timestamp and records `goal_reopened`, except transition to abandoned records `goal_abandoned`. Entering abandoned records abandonment; entering chapter active/completed records `chapter_started`/`chapter_completed`. Initial completed/active/abandoned inserts are supported. An unchanged status update emits nothing. Goal completion never deletes the goal.

History snapshots include the original IDs, title, type, and status transition where relevant. Deleting a goal removes its graph edges, detaches its children, and sets history's goal reference to null. Deleting a chapter detaches goals and history. Snapshots survive both operations. Deleting the Auth account intentionally cascades all of that account's personal data; ordinary clients cannot delete profiles. History is permanent within the account, not a way to retain data after account erasure.

## Authorization and privileges

RLS is enabled on all five tables, with explicit owner-only policies for authenticated users. Anonymous clients have no table grants. Owner identity cannot be changed, and composite foreign keys enforce same-owner relationships independently of frontend checks or RLS.

Clients can read/update their profile, and read/create/update/delete their own chapters, goals and connections. Profiles are provisioned by the signup trigger; an owner-only insert policy permits recovery of a missing profile. Progress permits only SELECT and INSERT; no UPDATE/DELETE grants or policies exist. Client inserts must use a nonempty `custom.*` event type. Reserved automatic event names can only be inserted by the database triggers. Custom event metadata is user-authored and is not a verified status transition.

Trigger functions live in the unexposed `private` schema, have an empty fixed `search_path`, and use fully qualified table references. Client/PUBLIC execution privileges are revoked. Only profile creation, graph validation, and transactional automatic history use `SECURITY DEFINER`. Such functions run only as triggers, not client-callable RPCs. Owner-run foreign-key actions can detach deleted historical references without granting history mutation to clients.

The schema otherwise uses standard PostgreSQL. A future self-hosted move must replace the `auth.users`/`auth.uid()` integration and configure equivalent roles; no custom server or Supabase-only business logic service is needed.

## Auth and data access

- `/`: existing Hello section plus account links.
- `/sign-up`, `/sign-in`: email/password forms with loading, validation, confirmation and error states.
- `/auth/callback`: confirmation handling with recoverable error display.
- `/app`: minimal protected account page and sign-out; no management dashboard.
- Unknown routes: a simple not-found page.

`AuthProvider` restores the SDK session and subscribes to auth changes, unsubscribing on unmount. A late restore response cannot replace a newer auth event. The SDK persists and refreshes the browser session; local sign-out clears this device's session. `RequireAuth` is a UI guard, not a security boundary. All database authorization remains in PostgreSQL.

UI components call `auth.service.ts` and repository methods, not Supabase queries. Repositories return typed records and throw contextual `DataError` objects, including PostgreSQL/PostgREST error codes. Single-record mutations use returned rows to detect missing/inaccessible IDs. Callers do not supply ownership or timestamps. Goal/progress lists support filters and pagination (default 50, maximum 100). Chapter/connection lists currently use the API's configured row limit; add pagination when management screens need larger collections.

Repositories provide chapter/goal/connection CRUD, profile read/update, and progress read/append only. Their plain input/result boundaries can later be backed by a REST API without moving queries into React.

## File inventory

Modified existing files:

- `src/App.tsx`: retain home content, add routing/provider and account links.
- `README.md`: add a link to this implementation guide; preserve original template notes.

New files:

- `.env.example`, ignored `.env.local`, `src/vite-env.d.ts`.
- `src/lib/supabase.ts`, `src/lib/data-error.ts`, `src/types/database.ts`.
- `src/services/auth.service.ts`.
- `src/auth/auth-context.ts`, `src/auth/AuthProvider.tsx`, `src/auth/RequireAuth.tsx`, `src/hooks/use-auth.ts`.
- `src/components/auth/AuthForm.tsx`, `src/pages/AccountPage.tsx`, `src/pages/AuthCallbackPage.tsx`.
- `src/repositories/profiles.repository.ts`, `chapters.repository.ts`, `goals.repository.ts`, `connections.repository.ts`, `progress.repository.ts`.
- `supabase/config.toml`, `supabase/migrations/20261021000100_backend_foundation.sql`, `supabase/tests/backend_foundation.sql`.
- `scripts/verify-database.mjs`, `docs/backend.md`.

## Verification

Executed:

- `npm run lint`: passed.
- `npx tsc -b`: passed.
- Additional strict check, `npx tsc -p tsconfig.app.json --strict --noEmit`: passed without changing the existing TypeScript configuration.
- `npm run build`: passed. The unchanged Vite config warns that its existing `__dirname` alias will be incompatible with a future default native config loader; this does not fail today's build.
- Migration execution in isolated **PGlite PostgreSQL**, existing-user backfill, and **52 SQL assertions**: passed. Tests include role-based RLS, authenticated CRUD, cross-user reads/updates/deletes, ownership tampering, cross-user FKs, prerequisite/parent cycles, reverse-related duplicates, automatic status-event deduplication, custom event inserts, history modification rejection, and history survival after deletion.
- Browser: home preserved, signed-out `/app` redirects to sign-in, signup renders with existing theme, signup deep-link reload works, callback errors display, and unknown routes show the not-found page. No browser warnings/errors were reported in the inspected log.
- Hosted read-only connectivity: Auth settings 200, email signup enabled; goals endpoint 404/PGRST205 (migration still pending).

Limits: PGlite used a minimal `auth.users`/`auth.uid()` contract and real PostgreSQL roles/RLS, not the Supabase Auth service or PostgREST. Docker/PostgreSQL server were not installed. Hosted migrations, real two-account Auth and repository HTTP round trips, email delivery, session refresh/sign-out on real accounts, and simultaneous database transactions have **not** been tested. No test accounts were created in your hosted project.

To rerun the embedded checks without adding application dependencies, install the optional runtime in a temporary directory:

```powershell
npm install --prefix "$env:TEMP/lifepath-db-verification" --no-audit --no-fund --ignore-scripts @electric-sql/pglite
node scripts/verify-database.mjs
```

Set `PGLITE_MODULE` to the absolute `.../@electric-sql/pglite/dist/index.js` path if the runtime is installed elsewhere. For real local Supabase, install/start Docker, use `npx supabase start`, then `npx supabase db reset` **only against a disposable local database**. Run the SQL test file with `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/backend_foundation.sql`. Tests roll back their fixtures and must run as the database owner.

Before production, sign up two test users through the UI, confirm emails, sign in, reload `/app`, and sign out. Exercise each repository with both sessions, attempt foreign ownership links and writes, and confirm history survives goal/chapter deletion. For concurrency, open two SQL sessions as `authenticated` with the same test user's JWT claim; in open transactions attempt opposite prerequisite edges A→B and B→A. The second should block until the first commits, then reject its cycle. Repeat with parent changes and at repeatable-read isolation (expect a serialization failure rather than accepting the second cycle).

Theme preservation baseline: `src/index.css` SHA-256 `1C8F6982A481BD712492FE8A0074D8FDAD4D92161C233696895FFFBBC1390FE4`.

## References

- [Supabase public versus secret keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase Auth state subscriptions](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL trigger visibility](https://www.postgresql.org/docs/current/trigger-datachanges.html)
- [PGlite verification runtime](https://pglite.dev/docs/)

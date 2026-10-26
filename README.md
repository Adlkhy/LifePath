# Lifepath

Lifepath is a personal planning and reflection app. It brings long-term visions, concrete goals, small quests, life chapters, and memories into one place. The idea is to make progress easier to see: break a large ambition into steps, identify what needs to happen first, choose a useful next action, and keep a record of what happened along the way.

The app is built for individual accounts. Each person signs in to a private workspace; the database uses row-level security to keep accounts separate.

## What you can do

- **Plan life chapters** with optional dates and statuses, then reorder them and see their goals, achievements, and memories together.
- **Create visions, goals, milestones, and quests** with descriptions, motivation, success criteria, priorities, deadlines, statuses, parent goals, and optional chapters.
- **Connect goals** through prerequisites and related links. The Focus page surfaces available quests, active goals, upcoming deadlines, and work blocked by prerequisites.
- **Explore the Life Map**, an interactive graph of goals and relationships. Filter it, inspect a goal, move nodes, or generate a layout. Saved positions follow your account.
- **Follow the Journey**, a timeline of progress events, chapter transitions, memories, and reflections. Filter by chapter or entry type and group by month or year.
- **Save memories** with optional photos and reflections attached to a goal, chapter, or achievement.
- **Switch between light and dark mode** from the navbar; your choice is remembered in this browser.
- **Manage your data** from Settings: edit your display name, export or import a JSON backup, clean up unattached photo files, and sign out. Account deletion has an optional server function and stays disabled until that function is deployed and tested.

Goal and chapter status changes create progress history in the database. Deleting a goal or chapter detaches its history and memories while retaining their title snapshots; deleting an account removes its personal data.

## Visual design

The home page, authentication screens, and shared workspace components follow `DESIGN.md`: pastel paper surfaces, black outlines, pill controls, colorful stickers, and static blue ribbon artwork. The public pages always use the light palette; the workspace retains its light/dark toggle. Antonio (the reference's suggested display substitute) and Inter are bundled locally. Navigation and poster layouts adapt to mobile screens. Motion adds brief spring feedback to buttons and navigation, card lifts on hover and keyboard focus, sticker tilts, and notification entrances/exits. Dialogs and form fields use short CSS transitions. Reduced-motion preferences disable movement, and disabled buttons do not animate.

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, TypeScript 6, Vite 8, React Router 7 |
| UI | Tailwind CSS 4, Base UI, shadcn-style components, Lucide icons, Inter variable font |
| Map | React Flow (`@xyflow/react`) and Dagre layout |
| Backend | Supabase Auth, PostgreSQL, Row Level Security, SQL migrations, private Supabase Storage |
| Optional account deletion | Supabase Edge Function |
| Deployment config | Vercel SPA rewrite in `vercel.json` |

The browser uses typed repositories and services for data access. Supabase policies and database constraints enforce ownership and relationship integrity. The UI guard redirects signed-out users; database authorization is enforced separately by PostgreSQL.

## Run locally

Prerequisites: a Node.js version supported by Vite 8 (Node 22.12+ works), npm, and a Supabase project. The project includes `package-lock.json`, so use `npm ci` for a reproducible install.

1. Install dependencies: `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and **publishable** key (`sb_publishable_...`).
3. Apply the SQL files in `supabase/migrations/` in filename order to the intended Supabase project. On a linked CLI project, inspect `npx supabase migration list` and `npx supabase db push --dry-run` before running `npx supabase db push`. Do not replay migrations that were already applied through the SQL editor.
4. In Supabase Authentication → URL Configuration, set the site URL to your app origin and allow the exact `<origin>/auth/callback` redirect URL. For the default local server, use `http://localhost:5173/auth/callback`. Email confirmation is expected by the sign-up flow.
5. Run `npm run dev` and open the URL Vite prints.

Example environment file:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
VITE_ENABLE_ACCOUNT_DELETION=false
```

Only use a publishable key in `VITE_` variables: Vite embeds them in the browser bundle. Keep database passwords, service-role keys, and `sb_secret_` keys out of frontend configuration. `.env.local` is ignored by Git; `.env.example` contains placeholders.

The migrations create the account profile, chapters, goals, goal connections, progress history, saved map positions, memories, a private `memory-photos` bucket, and transactional JSON transfer functions. They are required for the matching app features. The Storage bucket is created by migration; do not create a public bucket in its place. After schema changes, keep `src/types/database.ts` in sync; it is currently maintained in the repository rather than generated automatically.

## Data and backups

Settings exports chapters, goals, connections, memories, and progress history as JSON. Import previews and validates a backup, then adds its records with new IDs in one database transaction. It does not overwrite existing records; backups overlapping existing or previously imported records are rejected. Imports are limited to 10 MB and 10,000 records.

**Photo files are not in the JSON backup.** Back up photos separately and reattach them after import. The private Storage bucket accepts JPEG, PNG, or WebP files up to 5 MB. Database and Storage operations are separate, so interrupted uploads can leave unused files; Settings includes a cleanup action for those files.

## Build and deploy

```bash
npm run lint
npm run build
npm run preview
```

`npm run build` runs TypeScript project checks and creates `dist/`. The checked-in `vercel.json` builds the Vite app and rewrites routes to `index.html`, allowing direct visits to routes such as `/app/map` and `/auth/callback`. On Vercel, configure the same two Supabase environment variables for the intended deployment and add that deployment's exact callback URL in Supabase Auth. Rebuild after changing Vite environment variables.

Account deletion is **off by default**. To enable it, deploy `supabase/functions/delete-account/` to the correct Supabase project, set its `ALLOWED_ORIGINS` secret to approved exact frontend origins, verify authenticated deletion with disposable accounts, then set `VITE_ENABLE_ACCOUNT_DELETION=true` and rebuild. The function uses server-side Supabase credentials supplied by the function runtime; never expose those credentials to Vite.

The repository contains deployment configuration, but this README does not assume the migrations, function, Auth redirects, or frontend have already been deployed. Check those settings and exercise the app with two separate accounts before a public release.

## Project layout

```text
src/pages/          Routes for planning, map, journey, memories, and settings
src/components/     Forms, navigation, map, memory, and shared UI
src/lib/            Domain logic, validation, layout, and Supabase client
src/repositories/   Typed database queries
src/services/       Auth, memory/photo, and account operations
src/state/          Shared application data and feedback
src/types/          Database and domain types
supabase/migrations/   Database schema and policy changes
supabase/functions/    Optional account deletion function
```

## Current limitations

- Planning features at `/app` require a signed-in account; the home page introduces chapters, goals, the Life Map, and the Journey.
- JSON export excludes photo bytes and account credentials.
- Changes made in another browser session appear after a reload; the app does not subscribe to Supabase Realtime.
- A production smoke test still needs a configured Supabase project, migrations, Auth redirects, Storage, and a deployed frontend. The optional account deletion function needs its own deployment test.

# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env (api-server): `DATABASE_URL` — Postgres connection string
- Optional env (api-server, admin dashboard auto-login via `POST /admin/dash-link`):
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (service role — server only, never
  ship to a client), `DASHBOARD_URL` (box-admin origin). Without them the mobile
  app's admin WebView falls back to box-admin's normal login.
- Env (wodplace): `EXPO_PUBLIC_API_URL` (api-server origin), `EXPO_PUBLIC_DASHBOARD_URL`
  (box-admin origin shown in the admin WebView).
- **Supabase Auth config for the dashboard auto-login link** (Authentication →
  URL Configuration):
  - **Local dev:** set **Site URL** to the box-admin LAN origin
    (`http://192.168.1.87:5002` today — match `DASHBOARD_URL` /
    `EXPO_PUBLIC_DASHBOARD_URL`). GoTrue does **not** reliably honor
    `uri_allow_list` / Redirect URLs for a raw `http://<LAN-IP>:port`
    (confirmed via the Management API — the entry was present and still
    ignored), but it always accepts a `redirect_to` whose host:port matches
    the Site URL. Without this the magic link's `redirect_to` gets rewritten
    to the default Site URL (`http://localhost:3000`) and the WebView shows
    `NSURLErrorDomain -1004`.
  - **Production:** once box-admin is on a real HTTPS domain, set Site URL
    back to that app's own URL and add the dashboard origin to Redirect URLs
    (real domains + HTTPS match `uri_allow_list` fine).
  - Keep the magic-link / OTP expiry short.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Schema & migrations

The shared Supabase project `wiwpaekdykxernegicdv` is touched by **two
mechanisms that are deliberately not unified** — see `supabase/README.md` for
the full "who owns what":

- **Drizzle (`lib/db`)** — declarative, `pnpm --filter db push` (also run by
  `scripts/post-merge.sh`). Owns the api-server's own tables. Never run with
  `--force` against this DB.
- **`supabase/migrations/*.sql`** — hand-run once in the Supabase SQL Editor,
  then committed with a `STATUS: applied` banner. History, not a queue. Owns
  RLS / policies / triggers / functions / grants and dashboard-only tables
  (`boxes`, `box_members`, `user_roles`, `profiles`, `admin_invites`, …).
  `supabase/archive/` holds crossfit-dash-pro's pre-port history — a different
  DB, never applied here.
- **`lib/supabase-types`** (`@workspace/supabase-types`) — generated
  `Database` type shared by `artifacts/box-admin` and `artifacts/super-admin`.
  Regenerate after any migration:
  `npx supabase gen types typescript --project-id wiwpaekdykxernegicdv > lib/supabase-types/src/index.ts`.

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Supabase schema drift vs Drizzle.** Several tables in the shared Supabase
  project have columns the `@workspace/db` schema doesn't model —
  `box_settings` / `box_members` / `boxes` aren't modelled at all (queried via
  raw SQL), and the `contract_*` tables carry a `NOT NULL box_id` FK. Adding a
  new insert against these tables via Drizzle will hit a not-null violation
  until the column is set. See "Schema & migrations" above and
  `supabase/README.md` for the Drizzle vs SQL-migration boundary.
- **`social.ts` (api-server) has ~18 standing `tsc` errors** — `req.params.x`
  is `string | string[]` under `@types/express` 5, passed straight into
  drizzle `eq()`. Known since onboarding; `esbuild` build is unaffected.
  `pnpm --filter @workspace/api-server run typecheck` is expected to be red.

### Pending

- **Member contract flow is not box-scoped.** `contract_acceptances` and
  `contract_read_progress` inserts (`routes/contracts.ts`,
  `POST /contracts/acceptance` and `/contracts/{slug}/read`) still omit
  `box_id`, so they 500 against the real DB. A member can belong to several
  boxes by design, so the server must NOT guess — the box the member is
  currently viewing has to come explicitly from the mobile app. That needs
  the contract screens to track "which box am I in right now", which is a
  separate design task. Admin-side contract routes already resolve the box
  via `resolveBoxId(adminUserId)` (`lib/boxContext.ts`).

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

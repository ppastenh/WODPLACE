# supabase/

Schema-change **history** for the shared Supabase project
`wiwpaekdykxernegicdv` (org "Wodplace-Replit"). This folder is **not wired to
any CLI** — there is no `config.toml`, no linked project, no `db push` / `db
reset` script. That is deliberate: it removes any accidental path to
re-applying these files.

## `migrations/` — already applied, do not re-run

| file | what it did | applied |
|---|---|---|
| `20260830190000_wodplace_admin_panel_port.sql` | ported the crossfit-dash-pro admin panel onto the shared DB: columns on `box_members` / `class_sessions` / `contract_documents`, RLS/policies, grants | 2026-08-30, SQL Editor |
| `20260831180000_profiles_for_super_admin_hub.sql` | `public.profiles` (id → auth.users, email, created_at), RLS, `sync_profile_from_auth` trigger, backfill, `boxes.owner_user_id` text → uuid | 2026-08-31, SQL Editor |
| `20260831193000_user_roles_escalation_guard.sql` | `is_super_admin()` + `guard_user_roles_writes()` BEFORE trigger on `user_roles` | 2026-08-31, SQL Editor |

Every file is additive and idempotent (`IF NOT EXISTS`, `DROP POLICY IF
EXISTS`, guarded `DO` blocks), so an accidental re-run is non-destructive — but
they are **history, not a queue**. To make a *new* schema change, see "Who owns
what" below.

## `diagnostics/` — read-only introspection

`inspect_before_migration.sql` and `inspect_write_policies.sql` only read
catalogs. Safe to run any time in the SQL Editor to check current triggers /
policies / grants.

## `archive/crossfit-dash-pro-standalone/`

History of a **different** database — crossfit-dash-pro's own pre-port Lovable
project. Never applied here. See the README in that folder.

## Who owns what (schema change boundary)

Two mechanisms touch `wiwpaekdykxernegicdv`. They are **not** being unified
today; keep the split:

- **Drizzle (`lib/db`)** owns the tables the api-server reads/writes through
  Drizzle: `wodplace_users`, `contract_documents`, `contract_acceptances`,
  `box_settings`, `social_*`, `blocked_users`, `admin_pins`, `posts`.
  Changes go in `lib/db/src/schema/` and reach the DB via `pnpm --filter db
  push` (run by `scripts/post-merge.sh`).
- **`supabase/migrations/*.sql`** owns everything Drizzle does not model: RLS,
  policies, triggers, functions, grants, `auth`-schema hooks, storage
  policies, enum value additions, and tables only the dashboards use
  (`boxes`, `box_members`, `user_roles`, `profiles`, `admin_invites`, …).
  A new change here = a new SQL file, run once in the SQL Editor, then
  committed with a `STATUS: applied` banner.

**Rules**
- `drizzle-kit push` must never be run with `--force` against this DB — it
  would drop the dashboard-only tables, RLS and triggers that Drizzle doesn't
  know about. Without `--force` it aborts on destructive diffs, which is the
  intended safety net.
- New dashboard tables / policies / triggers go through `supabase/migrations/`,
  never Drizzle.
- After running a new migration in the SQL Editor, regenerate the shared types:
  `npx supabase gen types typescript --project-id wiwpaekdykxernegicdv > lib/supabase-types/src/index.ts`
  (re-add the header).

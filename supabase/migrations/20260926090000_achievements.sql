-- ============================================================================
-- ACHIEVEMENTS — Fase 1 (medallas automáticas)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL
-- (the `postgres` role, which has BYPASSRLS).
-- ----------------------------------------------------------------------------
-- One row per unlocked achievement. The catalog of achievement definitions
-- (names, descriptions, thresholds) lives in code
-- (api-server/src/lib/achievements/catalog.ts), not in the database — it's a
-- fixed, curated list, not something any app UI lets someone edit. This table
-- only records WHO unlocked WHAT and WHEN; permanent once written (never
-- deleted by re-evaluation, even if the underlying data — a PR, a booking —
-- is later removed).
--
-- `awarded_by` / `box_id` are only ever set for MOVIMIENTO achievements
-- (Fase 2, coach-granted) — null for every automatic one.
--
-- No RLS policies (RLS enabled with none = default-deny for anon/
-- authenticated, same fix as class_bookings' lockdown): only api-server's
-- `postgres` connection (BYPASSRLS) ever touches this table in Fase 1 —
-- neither wodplace nor box-admin talk to it directly via Supabase.
-- ============================================================================

begin;

create table if not exists public.user_achievements (
  id           text primary key default gen_random_uuid()::text,
  user_id      text not null references public.wodplace_users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at  timestamptz not null default now(),
  awarded_by   text,
  box_id       text,
  created_at   timestamptz not null default now()
);

create unique index if not exists user_achievements_user_achievement_idx
  on public.user_achievements (user_id, achievement_id);

create index if not exists user_achievements_user_idx
  on public.user_achievements (user_id);

alter table public.user_achievements enable row level security;

commit;

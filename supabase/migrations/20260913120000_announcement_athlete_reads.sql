-- ============================================================================
-- ANNOUNCEMENT_ATHLETE_READS  (proyecto WODPLACE / wiwpaekdykxernegicdv)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL
-- (the `postgres` role). This file is HISTORY, kept for reference only.
-- ----------------------------------------------------------------------------
-- Read-tracking for avisos, but for ATHLETES (mobile), not staff.
--
-- Why a separate table from `announcement_reads`: that one is keyed by
-- `user_id uuid` because its readers are box-admin staff with real Supabase
-- Auth accounts (the panel's own bell). Athletes have no Auth account — their
-- id is a TEXT row in `wodplace_users`, generated on-device — so it can't
-- share that column's type (same TEXT-vs-UUID split already used between
-- `box_members.user_id` and `user_roles.user_id`).
--
-- Drives GET /box-memberships/announcements: an unread `send_push`
-- announcement stays in the athlete's popup queue until they confirm reading
-- it (POST /box-memberships/announcements/:id/read), which writes here.
--
-- No athlete-facing RLS policy: wodplace has no Supabase Auth session, so it
-- only ever reaches this table through api-server's service connection
-- (bypasses RLS), same as box_members/wodplace_users. Only a box-staff read
-- policy is added, for parity with box_members.
--
-- Aditivo e idempotente.
-- ============================================================================

begin;

create table if not exists public.announcement_athlete_reads (
  announcement_id text not null references public.announcements(id) on delete cascade,
  box_id          text not null references public.boxes(id) on delete cascade,
  user_id         text not null references public.wodplace_users(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcement_athlete_reads enable row level security;

drop policy if exists "box staff read announcement_athlete_reads" on public.announcement_athlete_reads;
create policy "box staff read announcement_athlete_reads" on public.announcement_athlete_reads
  for select to authenticated
  using (public.user_is_box_staff(box_id));

grant select on public.announcement_athlete_reads to authenticated;
grant all on public.announcement_athlete_reads to service_role;

commit;

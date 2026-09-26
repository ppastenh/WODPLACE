-- ============================================================================
-- CLASS_BOOKINGS RLS LOCKDOWN  (proyecto WODPLACE / wiwpaekdykxernegicdv)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL
-- (the `postgres` role, which has BYPASSRLS — confirmed before running this,
-- so api-server's own booking flow, which writes here via a direct Postgres
-- connection, is unaffected either way).
-- This file is HISTORY, kept for reference only.
-- ----------------------------------------------------------------------------
-- Same class of gap as the 2026-09-14 critical RLS lockdown, just missed
-- from that audit's table list: `class_bookings` had RLS disabled with
-- Supabase's default full anon/authenticated grants — anyone with the
-- public anon key could read or write any box's bookings directly via
-- PostgREST, with no login required.
--
-- Fix: same `user_is_box_staff(box_id)` policy shape already used on
-- box_members/class_sessions — box-admin's own direct-Supabase writes here
-- (BookClassSheet's manual class assignment, attendance views in classes.tsx)
-- keep working for staff of that box; nobody else can read or write.
--
-- Aditivo e idempotente.
-- ============================================================================

begin;

alter table public.class_bookings enable row level security;

drop policy if exists "box staff read class_bookings" on public.class_bookings;
create policy "box staff read class_bookings" on public.class_bookings
  for select to authenticated
  using (public.user_is_box_staff(box_id));

drop policy if exists "box staff write class_bookings" on public.class_bookings;
create policy "box staff write class_bookings" on public.class_bookings
  for all to authenticated
  using (public.user_is_box_staff(box_id))
  with check (public.user_is_box_staff(box_id));

commit;

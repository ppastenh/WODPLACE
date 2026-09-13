-- ============================================================================
-- GLOBAL RLS HARDENING — social_posts / social_comments / social_reactions /
--                         wodplace_users   (proyecto WODPLACE / wiwpaekdykxernegicdv)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL
-- (the `postgres` role, which has BYPASSRLS — confirmed before running this,
-- so none of api-server's own Drizzle-based reads/writes are affected).
-- This file is HISTORY, kept for reference only. See supabase/README.md.
-- ----------------------------------------------------------------------------
-- Context: these 4 tables (all Drizzle-owned, written by api-server via a
-- direct Postgres connection that bypasses RLS entirely) had RLS disabled,
-- protected only by broad `authenticated`/`anon` grants. Since nothing in the
-- product queries them directly through the Supabase client/PostgREST today
-- (confirmed: no `supabase.from("social_posts"|"social_comments"|
-- "social_reactions"|"wodplace_users")` anywhere in box-admin or
-- super-admin), that meant *any* authenticated Supabase Auth session could
-- read/write them raw with the JS SDK — a real gap, not just a theoretical
-- one, now that the super-admin redesign needs some of this data over
-- PostgREST (Moderación Global, "ver alumnos por box").
--
-- Fix: enable RLS + policies scoped to admin roles only, same
-- `user_is_any_box_admin()` helper already used for social_reports
-- (20260830190000_wodplace_admin_panel_port.sql). No policy is added for
-- ordinary members — they have no legitimate direct-PostgREST path to these
-- tables (the mobile app talks to api-server, never to Supabase directly),
-- so leaving those commands ungranted is intentional, not an oversight.
--
-- Aditivo e idempotente. Correr en el SQL Editor si hiciera falta reaplicar.
-- ============================================================================

begin;

-- social_posts: admins can read (moderation context) and soft-delete
-- (deletedAt, same as api-server's own DELETE /social/posts/:id) via
-- PostgREST now too.
alter table public.social_posts enable row level security;

drop policy if exists "admin read social_posts" on public.social_posts;
create policy "admin read social_posts" on public.social_posts
  for select to authenticated
  using (public.user_is_any_box_admin());

drop policy if exists "admin moderate social_posts" on public.social_posts;
create policy "admin moderate social_posts" on public.social_posts
  for update to authenticated
  using (public.user_is_any_box_admin())
  with check (public.user_is_any_box_admin());

-- social_comments: same shape — read for context, soft-delete for moderation.
alter table public.social_comments enable row level security;

drop policy if exists "admin read social_comments" on public.social_comments;
create policy "admin read social_comments" on public.social_comments
  for select to authenticated
  using (public.user_is_any_box_admin());

drop policy if exists "admin moderate social_comments" on public.social_comments;
create policy "admin moderate social_comments" on public.social_comments
  for update to authenticated
  using (public.user_is_any_box_admin())
  with check (public.user_is_any_box_admin());

-- social_reactions: read-only for admins — no product flow ever needs to
-- write a reaction on someone's behalf, so no write policy is added.
alter table public.social_reactions enable row level security;

drop policy if exists "admin read social_reactions" on public.social_reactions;
create policy "admin read social_reactions" on public.social_reactions
  for select to authenticated
  using (public.user_is_any_box_admin());

-- wodplace_users: read-only for admins (needed for "ver alumnos por box" and
-- resolving names/emails in the admin panels) — profile edits still go
-- through api-server, never PostgREST, so no write policy here either.
alter table public.wodplace_users enable row level security;

drop policy if exists "admin read wodplace_users" on public.wodplace_users;
create policy "admin read wodplace_users" on public.wodplace_users
  for select to authenticated
  using (public.user_is_any_box_admin());

commit;

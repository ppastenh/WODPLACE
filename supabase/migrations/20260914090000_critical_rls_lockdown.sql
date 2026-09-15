-- ============================================================================
-- CRITICAL RLS LOCKDOWN  (proyecto WODPLACE / wiwpaekdykxernegicdv)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL
-- (the `postgres` role, which has BYPASSRLS — confirmed before running this,
-- so none of api-server's own Drizzle-based reads/writes are affected).
-- This file is HISTORY, kept for reference only.
-- ----------------------------------------------------------------------------
-- CONTEXT — this closes a live, confirmed vulnerability, not a theoretical
-- one. A live audit (querying pg_class.relrowsecurity + pg_policies +
-- information_schema.role_table_grants directly) found:
--
--   1. `boxes`, `plans`, `coaches`, `classes`, `announcements`,
--      `announcement_comments`, `announcement_reactions`,
--      `contract_documents`, `payments`, `box_settings` had RLS DISABLED
--      while still carrying Supabase's default full SELECT/INSERT/UPDATE/
--      DELETE grants to BOTH `authenticated` AND `anon`. Since RLS was off,
--      those grants were the only gate — meaning anyone with the project's
--      public anon key (no login required at all) could read or write any
--      box's plans, coaches, classes, avisos, contracts, payments and
--      settings directly via PostgREST, completely bypassing box-admin's
--      own box selector.
--
--   2. `user_roles` was in that same disabled-RLS state — the single most
--      severe finding, since it meant anyone could INSERT a row granting
--      themselves (or any user_id) `super_admin`, with no check at all.
--
--   3. `social_posts`, `social_comments`, `social_reactions`,
--      `social_reports`, `wodplace_users`, `contract_acceptances` DID have
--      RLS enabled, but scoped to `user_is_any_box_admin()` — "is admin of
--      *some* box" rather than *this* box. That was an intentional
--      simplification documented at the time as "WODPLACE is single-box
--      today"; it no longer holds now that plans/class_sessions/
--      announcements/box_members are genuinely per-box, so any box_admin
--      could read/moderate every box's social feed and every athlete's
--      profile, not just their own.
--
-- FIX:
--   - Tables in (1): enable RLS, add the same `user_is_box_staff(box_id)`
--     policy shape already proven safe on box_members/class_sessions (two
--     policies per table: "... read ..." for select, "... write ..." for
--     all). `anon`/`authenticated` grants are left as-is, exactly like on
--     box_members — RLS alone is sufficient to close them off, since a role
--     with no matching policy gets zero rows/zero write ability regardless
--     of the table-level grant.
--   - `boxes` has no `box_id` column (its own `id` IS the box id), so its
--     policy checks `user_is_box_staff(id)` instead.
--   - `user_roles`: RLS enabled with exactly two policies — anyone can read
--     their OWN row (`user_id = auth.uid()`, matching the one real query
--     box-admin's `_admin.tsx` loader makes today), and only a genuine
--     super_admin (new `user_is_super_admin()` helper, mirroring
--     `user_is_any_box_admin()`'s existing SECURITY DEFINER shape so it
--     doesn't recurse against its own RLS) can insert/update/delete ANY
--     row, including their own. This is deliberately tighter than
--     `user_is_any_box_admin()` — a box_admin must never be able to grant
--     roles, not even for their own box; that stays a super-admin action,
--     matching how super-admin's own admins.tsx already does 100% of the
--     real inserts/deletes against this table today (box-admin never
--     writes to user_roles at all).
--   - Tables in (3): swapped `user_is_any_box_admin()` for
--     `user_is_box_staff(box_id)` on their own `box_id` column.
--     `wodplace_users` has no `box_id` of its own (an athlete can belong to
--     several boxes), so its read policy instead checks that the athlete
--     has a `box_members` row for a box the requester staffs.
--
-- Aditivo e idempotente donde es posible; los `drop policy if exists` hacen
-- que correr esto de nuevo sea seguro.
-- ============================================================================

begin;

-- ── New helper: strict super_admin check (writes to user_roles only) ───────
create or replace function public.user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

revoke all on function public.user_is_super_admin() from public, anon;
grant execute on function public.user_is_super_admin() to authenticated, service_role;

-- ── user_roles — the most urgent one: closes the self-escalation hole ──────
alter table public.user_roles enable row level security;

drop policy if exists "self read own role" on public.user_roles;
create policy "self read own role" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "super admin manages user_roles" on public.user_roles;
create policy "super admin manages user_roles" on public.user_roles
  for all to authenticated
  using (public.user_is_super_admin())
  with check (public.user_is_super_admin());

-- ── boxes (policy keys off the row's own id, not a box_id column) ──────────
alter table public.boxes enable row level security;

drop policy if exists "box staff read boxes" on public.boxes;
create policy "box staff read boxes" on public.boxes
  for select to authenticated
  using (public.user_is_box_staff(id));

drop policy if exists "box staff write boxes" on public.boxes;
create policy "box staff write boxes" on public.boxes
  for all to authenticated
  using (public.user_is_box_staff(id))
  with check (public.user_is_box_staff(id));

-- ── Straightforward box_id-scoped tables ────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'plans', 'coaches', 'classes', 'announcements',
    'announcement_comments', 'announcement_reactions',
    'contract_documents', 'payments', 'box_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', 'box staff read ' || t, t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.user_is_box_staff(box_id));',
      'box staff read ' || t, t
    );

    execute format('drop policy if exists %I on public.%I;', 'box staff write ' || t, t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.user_is_box_staff(box_id)) with check (public.user_is_box_staff(box_id));',
      'box staff write ' || t, t
    );
  end loop;
end $$;

-- ── "Middle zone": per-box instead of any-box-admin ─────────────────────────
drop policy if exists "admin read social_posts" on public.social_posts;
create policy "admin read social_posts" on public.social_posts
  for select to authenticated
  using (public.user_is_box_staff(box_id));

drop policy if exists "admin moderate social_posts" on public.social_posts;
create policy "admin moderate social_posts" on public.social_posts
  for update to authenticated
  using (public.user_is_box_staff(box_id))
  with check (public.user_is_box_staff(box_id));

drop policy if exists "admin read social_comments" on public.social_comments;
create policy "admin read social_comments" on public.social_comments
  for select to authenticated
  using (public.user_is_box_staff(box_id));

drop policy if exists "admin moderate social_comments" on public.social_comments;
create policy "admin moderate social_comments" on public.social_comments
  for update to authenticated
  using (public.user_is_box_staff(box_id))
  with check (public.user_is_box_staff(box_id));

drop policy if exists "admin read social_reactions" on public.social_reactions;
create policy "admin read social_reactions" on public.social_reactions
  for select to authenticated
  using (public.user_is_box_staff(box_id));

drop policy if exists "box admin read social_reports" on public.social_reports;
create policy "box admin read social_reports" on public.social_reports
  for select to authenticated
  using (public.user_is_box_staff(box_id));

drop policy if exists "box admin resolve social_reports" on public.social_reports;
create policy "box admin resolve social_reports" on public.social_reports
  for update to authenticated
  using (public.user_is_box_staff(box_id))
  with check (public.user_is_box_staff(box_id));

drop policy if exists "box admin read contract_acceptances" on public.contract_acceptances;
create policy "box admin read contract_acceptances" on public.contract_acceptances
  for select to authenticated
  using (public.user_is_box_staff(box_id));

drop policy if exists "box admin mark seen contract_acceptances" on public.contract_acceptances;
create policy "box admin mark seen contract_acceptances" on public.contract_acceptances
  for update to authenticated
  using (public.user_is_box_staff(box_id))
  with check (public.user_is_box_staff(box_id));

-- wodplace_users has no box_id of its own — an admin can read a profile only
-- if that athlete belongs (via box_members) to a box the admin staffs.
drop policy if exists "admin read wodplace_users" on public.wodplace_users;
create policy "admin read wodplace_users" on public.wodplace_users
  for select to authenticated
  using (
    exists (
      select 1 from public.box_members bm
      where bm.user_id = wodplace_users.id
        and public.user_is_box_staff(bm.box_id)
    )
  );

commit;

-- Fase F (extra, post Fase A-E): "Quitar rol de coach" -- demote a coach
-- back to a plain athlete WITHOUT losing anything they generated (classes
-- taught, notes, attendance they marked, medals granted, the permission-
-- change audit trail). The `coaches` row is NEVER deleted by this flow --
-- deleting it is exactly what breaks history: class_sessions.coach_id and
-- user_achievements.coach_id are ON DELETE SET NULL (loses attribution),
-- and coach_permission_changes.coach_id is ON DELETE CASCADE (destroys the
-- whole audit trail). Instead: drop the user_roles row (that's what
-- actually grants "is staff"/"has permission X" -- user_is_box_staff and
-- user_has_box_permission both key off user_roles, never off coaches'
-- existence), mark the row 'inactivo', and unlink user_id so the account
-- no longer resolves to this coach identity anywhere in the app. Coming
-- back as a coach later requires a fresh invite, same as any new coach.
--
-- Also fixes a bug found while designing this: "Pausar" (status =
-- 'pausado') has been cosmetic since it was introduced -- neither
-- my_coach_id nor user_has_box_permission ever checked coaches.status, so
-- a paused coach kept 100% of their real RLS-enforced access. Both now
-- require status = 'activo'.

-- ── Fix #1: my_coach_id -- the single function nearly every coach-scoped
-- policy (reads AND writes, "Mis clases de hoy", bookings_manage,
-- classes_edit, etc.) resolves "my own coach row" through. Returning null
-- for a non-active coach makes every one of those policies correctly see
-- them as having no coach identity, with no per-policy changes needed.
create or replace function public.my_coach_id(_box_id text)
returns text
language sql
stable
security definer
set search_path = 'public'
as $$
  select c.id from public.coaches c
  where c.user_id = auth.uid() and c.box_id = _box_id and c.status = 'activo'
  limit 1;
$$;

-- ── Fix #2: user_has_box_permission's coach branch -- same status gate for
-- the generic permission-flag checks (members_edit, finances_view, etc.)
-- that don't go through my_coach_id at all.
create or replace function public.user_has_box_permission(_box_id text, _permission text)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and (
        ur.role = 'super_admin'
        or (ur.role = 'box_admin' and ur.box_id = _box_id)
        or (
          ur.role = 'coach'
          and ur.box_id = _box_id
          and exists (
            select 1 from public.coaches c
            where c.user_id = auth.uid()
              and c.box_id = _box_id
              and c.status = 'activo'
              and coalesce((c.permissions ->> _permission)::boolean, false)
          )
        )
      )
  );
$$;

-- ── Fix #3: a paused coach shouldn't be able to self-edit their profile
-- either (Fase D) -- same status gate on that policy's USING clause.
drop policy if exists "coach edit own profile" on public.coaches;
create policy "coach edit own profile"
on public.coaches for update
using (user_id = auth.uid() and status = 'activo')
with check (
  user_id = auth.uid()
  and box_id is not distinct from (select box_id from public.coach_current(id))
  and status is not distinct from (select status from public.coach_current(id))
  and permissions is not distinct from (select permissions from public.coach_current(id))
  and name is not distinct from (select name from public.coach_current(id))
  and email is not distinct from (select email from public.coach_current(id))
);

-- ── "Quitar rol de coach" ────────────────────────────────────────────────
alter table public.coaches add column if not exists removed_at timestamptz;
alter table public.coaches add column if not exists removed_by_email text;

-- guard_user_roles_writes (20260831193000_user_roles_escalation_guard.sql)
-- blocks ANY client-initiated write to user_roles unless auth.uid() is
-- null (service role) or the caller is already a super_admin -- deliberate,
-- since user_roles is where privilege actually lives. remove_coach_role
-- needs to delete exactly one row there on behalf of a box_admin, which
-- that trigger would otherwise block even from inside this SECURITY
-- DEFINER function (SECURITY DEFINER elevates table-privilege checks, not
-- auth.uid() -- the trigger still sees the real caller). Rather than
-- weakening the trigger's actual rule, this adds one narrow, function-
-- scoped escape hatch: a transaction-local GUC that only THIS function
-- sets, right after it has independently verified the caller is a
-- box_admin/super_admin of the coach's own box. No client can set this GUC
-- directly -- PostgREST only exposes defined RPCs, never raw SQL.
create or replace function public.guard_user_roles_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  if public.is_super_admin() then
    return coalesce(new, old);
  end if;
  if current_setting('app.user_roles_guard_bypass', true) = 'remove_coach_role' then
    return coalesce(new, old);
  end if;
  raise exception 'Solo un super_admin puede modificar user_roles'
    using errcode = 'insufficient_privilege';
end;
$$;

-- SECURITY DEFINER: needs to read/write user_roles and coaches regardless
-- of the caller's own RLS visibility, and needs the guard bypass above.
-- Authorization is NOT implicit from that elevation -- it's checked
-- explicitly in the first few lines, same box_admin/super_admin shape used
-- everywhere else in this rollout (update_coach_permissions, etc.).
create or replace function public.remove_coach_role(p_coach_id text, p_removed_by_email text)
returns public.coaches
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_box_id text;
  v_user_id uuid;
  v_row public.coaches;
begin
  select box_id, user_id into v_box_id, v_user_id
  from public.coaches
  where id = p_coach_id;

  if v_box_id is null then
    raise exception 'Coach % not found', p_coach_id;
  end if;

  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = v_box_id))
  ) then
    raise exception 'No autorizado para quitar el rol de este coach'
      using errcode = 'insufficient_privilege';
  end if;

  -- Only the 'coach' role row for this box -- a user who is ALSO a
  -- box_admin for this same box (confirmed possible) keeps that role
  -- completely untouched.
  if v_user_id is not null then
    perform set_config('app.user_roles_guard_bypass', 'remove_coach_role', true);
    delete from public.user_roles
    where user_id = v_user_id and box_id = v_box_id and role = 'coach';
  end if;

  update public.coaches
  set status = 'inactivo',
      user_id = null,
      removed_at = now(),
      removed_by_email = p_removed_by_email,
      updated_at = now()
  where id = p_coach_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.remove_coach_role(text, text) from public, anon;
grant execute on function public.remove_coach_role(text, text) to authenticated;

-- Closes the 3 permissions left decorative after Fase 3
-- (classes_create, classes_edit, members_edit), plus member_requests,
-- found with RLS fully disabled while investigating this same area (same
-- category of pre-existing hole as prs/movements/pr_goals/
-- training_settings/admin_invites before those were fixed).

-- ── Helpers: read the CURRENT persisted value of a column this fase must
-- keep immutable for a coach's own update, regardless of what they submit.
-- STABLE + security definer so it reflects the pre-update row, not
-- whatever the in-flight UPDATE is trying to write.
create or replace function public.session_coach_id(_session_id text)
returns text
language sql
stable
security definer
set search_path = 'public'
as $$
  select coach_id from public.class_sessions where id = _session_id;
$$;

create or replace function public.box_member_plan_id(_box_id text, _user_id text)
returns text
language sql
stable
security definer
set search_path = 'public'
as $$
  select plan_id from public.box_members where box_id = _box_id and user_id = _user_id;
$$;

create or replace function public.box_member_next_payment_at(_box_id text, _user_id text)
returns date
language sql
stable
security definer
set search_path = 'public'
as $$
  select next_payment_at from public.box_members where box_id = _box_id and user_id = _user_id;
$$;

-- ── classes_create / classes_edit ────────────────────────────────────────
-- Replaces the plain "box staff insert/update/delete class_sessions"
-- policies from Fase 3's own fix (those were unconditional user_is_box_staff
-- -- anyone on staff, permission or not). Admin/super_admin keep exactly
-- that same unrestricted behavior via their own policy; a coach now needs
-- the matching permission AND (for create/edit/delete) must be acting on
-- their OWN class -- and can never change WHO teaches it (coach_id is
-- frozen for a coach's own edits; only admin can reassign a class).
drop policy if exists "box staff insert class_sessions" on public.class_sessions;
drop policy if exists "box staff update class_sessions" on public.class_sessions;
drop policy if exists "box staff delete class_sessions" on public.class_sessions;

create policy "admin manage class_sessions"
on public.class_sessions for all
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = class_sessions.box_id))
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = class_sessions.box_id))
  )
);

create policy "coach create own class_sessions"
on public.class_sessions for insert
with check (
  public.user_has_box_permission(box_id, 'classes_create')
  and coach_id is not null
  and coach_id = public.my_coach_id(box_id)
);

create policy "coach edit own class_sessions"
on public.class_sessions for update
using (
  public.user_has_box_permission(box_id, 'classes_edit')
  and coach_id is not null
  and coach_id = public.my_coach_id(box_id)
)
with check (
  public.user_has_box_permission(box_id, 'classes_edit')
  and coach_id = public.session_coach_id(id)
);

create policy "coach delete own class_sessions"
on public.class_sessions for delete
using (
  public.user_has_box_permission(box_id, 'classes_edit')
  and coach_id is not null
  and coach_id = public.my_coach_id(box_id)
);

-- ── members_edit ─────────────────────────────────────────────────────────
-- Covers phone/notes/member_since/status (matches the catalog's own hint,
-- "Modificar datos y estado de los atletas") -- NOT plan_id/next_payment_at
-- ("cambiar planes" stays admin-only always, per explicit product
-- decision), enforced by freezing both to their current value whenever a
-- non-admin performs the update, regardless of what they submit.
drop policy if exists "box staff update box_members" on public.box_members;

create policy "admin update box_members"
on public.box_members for update
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = box_members.box_id))
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = box_members.box_id))
  )
);

-- Postgres/PostgREST needs the row to ALSO pass the table's SELECT policy
-- for an UPDATE ... RETURNING (which Supabase's client always issues) to
-- return anything -- found live: members_edit=true alone matched 0 rows
-- until members_view was also granted. Rather than force every admin to
-- remember to grant both, extend the read policy itself: "can edit" is a
-- reasonable superset of "can view" anyway (editing someone you can't see
-- isn't a real product need), not a new privilege being handed out.
drop policy if exists "box staff read box_members" on public.box_members;
create policy "box staff read box_members"
on public.box_members for select
using (
  public.user_has_box_permission(box_id, 'members_view')
  or public.user_has_box_permission(box_id, 'members_edit')
);

create policy "coach edit box_members"
on public.box_members for update
using (public.user_has_box_permission(box_id, 'members_edit'))
with check (
  public.user_has_box_permission(box_id, 'members_edit')
  and plan_id is not distinct from public.box_member_plan_id(box_id, user_id)
  and next_payment_at is not distinct from public.box_member_next_payment_at(box_id, user_id)
);

-- ── member_requests: found with RLS fully disabled ──────────────────────
-- Any authenticated user could read/write this table directly. Approving/
-- rejecting a join request stays admin-only regardless of members_edit
-- (explicit product decision) -- reading stays open to all box staff
-- (same "read is baseline" pattern as everywhere else in this rollout).
alter table public.member_requests enable row level security;

create policy "box staff read member_requests"
on public.member_requests for select
using (public.user_is_box_staff(box_id));

create policy "admin manage member_requests"
on public.member_requests for all
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = member_requests.box_id))
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = member_requests.box_id))
  )
);

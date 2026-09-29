-- Fase 3: enforce each of the 8 coach permissions in RLS, module by module.
-- Every write policy below uses user_has_box_permission(box_id, key) instead
-- of user_is_box_staff(box_id) -- since that function already returns true
-- unconditionally for box_admin/super_admin (see its own definition,
-- 20261001110000_coach_permissions_catalog.sql), admin/super_admin behavior
-- is completely unchanged; only a coach's access actually narrows, and only
-- to what their own coaches.permissions row grants.
--
-- Two permissions (item 1, "gestionar reservas") get real ROW scoping, not
-- just a permission-flag check: a coach may only manage bookings for
-- class_sessions they are the coach_id of -- never another coach's classes,
-- and never a class with no coach assigned (coach_id is null never matches
-- any coach's own id, so those stay admin-only automatically). Reading
-- "Mis clases de hoy" (item 8) and its own bookings is baseline -- always
-- allowed for a coach's own classes regardless of the bookings_manage flag,
-- same as PRs/achievements are always readable (item 7).

create or replace function public.my_coach_id(_box_id text)
returns text
language sql
stable
security definer
set search_path = 'public'
as $$
  select c.id from public.coaches c
  where c.user_id = auth.uid() and c.box_id = _box_id
  limit 1;
$$;

-- ── 1. Gestionar reservas: scoped to the coach's OWN classes ────────────
drop policy if exists "box staff read class_bookings" on public.class_bookings;
create policy "box staff read class_bookings"
on public.class_bookings for select
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = class_bookings.box_id))
  )
  or exists (
    select 1 from public.class_sessions cs
    where cs.id = class_bookings.session_id
      and cs.coach_id is not null
      and cs.coach_id = public.my_coach_id(class_bookings.box_id)
  )
);

drop policy if exists "box staff write class_bookings" on public.class_bookings;
create policy "admin manage class_bookings"
on public.class_bookings for all
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = class_bookings.box_id))
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = class_bookings.box_id))
  )
);

create policy "coach manage own class_bookings"
on public.class_bookings for all
using (
  public.user_has_box_permission(box_id, 'bookings_manage')
  and exists (
    select 1 from public.class_sessions cs
    where cs.id = class_bookings.session_id
      and cs.coach_id is not null
      and cs.coach_id = public.my_coach_id(class_bookings.box_id)
  )
)
with check (
  public.user_has_box_permission(box_id, 'bookings_manage')
  and exists (
    select 1 from public.class_sessions cs
    where cs.id = class_bookings.session_id
      and cs.coach_id is not null
      and cs.coach_id = public.my_coach_id(class_bookings.box_id)
  )
);

-- ── 8. Mis clases de hoy: a coach only ever sees their OWN sessions ─────
-- (baseline, not gated by any permission flag -- same as PRs/achievements
-- reads). Write access to class_sessions itself (crear/editar clases) is
-- untouched here -- classes_create/classes_edit stay exactly as
-- decorative as they were before this migration; wiring those up is a
-- separate, not-yet-requested change.
drop policy if exists "box staff read class_sessions" on public.class_sessions;
create policy "box staff read class_sessions"
on public.class_sessions for select
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = class_sessions.box_id))
  )
  or (coach_id is not null and coach_id = public.my_coach_id(class_sessions.box_id))
);

-- ── 2. Ver miembros ──────────────────────────────────────────────────────
-- Write access to box_members (members_edit) is untouched -- same
-- "not requested in this pass" note as classes_create/edit above.
drop policy if exists "box staff read box_members" on public.box_members;
create policy "box staff read box_members"
on public.box_members for select
using (public.user_has_box_permission(box_id, 'members_view'));

-- ── 3. Publicar en Comunidad a nombre del Box ───────────────────────────
-- Reading announcements stays open to all box staff -- only authoring one
-- AS the box is gated. This is also the first time this permission gets
-- ANY database-level enforcement (it was client-only until now).
drop policy if exists "box staff write announcements" on public.announcements;
create policy "manage announcements (insert)"
on public.announcements for insert
with check (public.user_has_box_permission(box_id, 'community_post_as_box'));
create policy "manage announcements (update)"
on public.announcements for update
using (public.user_has_box_permission(box_id, 'community_post_as_box'))
with check (public.user_has_box_permission(box_id, 'community_post_as_box'));
create policy "manage announcements (delete)"
on public.announcements for delete
using (public.user_has_box_permission(box_id, 'community_post_as_box'));

-- ── 4. Dar medallas de movimiento y competencia ─────────────────────────
-- Reading achievements stays open (item 7's "solo lectura" baseline) --
-- only granting/revoking one manually is gated. Split out of the old
-- single "for all" policy, which combined both.
drop policy if exists "box staff manage manual achievements" on public.user_achievements;
create policy "box staff read manual achievements"
on public.user_achievements for select
using (box_id is not null and public.user_is_box_staff(box_id));
create policy "manage manual achievements (insert)"
on public.user_achievements for insert
with check (box_id is not null and public.user_has_box_permission(box_id, 'manual_achievements_manage'));
create policy "manage manual achievements (delete)"
on public.user_achievements for delete
using (box_id is not null and public.user_has_box_permission(box_id, 'manual_achievements_manage'));

-- ── 5. Publicar el WOD del día ───────────────────────────────────────────
-- Reading wod_of_day stays open (athletes/staff both need it) -- only
-- publishing/editing it is gated.
drop policy if exists "box staff manage wod_of_day" on public.wod_of_day;
create policy "box staff read wod_of_day"
on public.wod_of_day for select
using (public.user_is_box_staff(box_id));
create policy "manage wod_of_day (insert)"
on public.wod_of_day for insert
with check (public.user_has_box_permission(box_id, 'wod_of_day_publish'));
create policy "manage wod_of_day (update)"
on public.wod_of_day for update
using (public.user_has_box_permission(box_id, 'wod_of_day_publish'))
with check (public.user_has_box_permission(box_id, 'wod_of_day_publish'));
create policy "manage wod_of_day (delete)"
on public.wod_of_day for delete
using (public.user_has_box_permission(box_id, 'wod_of_day_publish'));

-- ── 6. Asignar el nivel (rank) del alumno ────────────────────────────────
-- Same shape as before (join through box_members to find which box this
-- athlete belongs to), just user_is_box_staff -> user_has_box_permission.
drop policy if exists "box staff can update athlete rank" on public.wodplace_users;
create policy "box staff can update athlete rank"
on public.wodplace_users for update
using (
  exists (
    select 1 from public.box_members bm
    where bm.user_id = wodplace_users.id
      and public.user_has_box_permission(bm.box_id, 'athlete_rank_assign')
  )
)
with check (
  exists (
    select 1 from public.box_members bm
    where bm.user_id = wodplace_users.id
      and public.user_has_box_permission(bm.box_id, 'athlete_rank_assign')
  )
);

-- ── 7. Ver PRs y medallas de sus alumnos, solo lectura ──────────────────
-- prs: already select-only for box staff (see 20261001090000_prs_rls_
-- lockdown.sql) -- nothing to change here, it was never writable via
-- direct Supabase to begin with. user_achievements read handled above.

-- ── Bug found during live verification of items 2 and 8 ─────────────────
-- "box staff write class_sessions" and "box staff write box_members" were
-- FOR ALL (using user_is_box_staff unconditionally) -- FOR ALL implicitly
-- covers SELECT too, so both silently kept granting box-wide read access
-- to every coach regardless of the new read-scoping policies above (RLS
-- policies for the same command OR together, so the old unconditional one
-- was overriding the new restrictive one). Split into their non-select
-- commands only, unconditional user_is_box_staff behavior otherwise
-- unchanged (classes_create/classes_edit/members_edit stay exactly as
-- decorative as before -- not part of this Fase 3 pass).
drop policy if exists "box staff write class_sessions" on public.class_sessions;
create policy "box staff insert class_sessions"
on public.class_sessions for insert
with check (public.user_is_box_staff(box_id));
create policy "box staff update class_sessions"
on public.class_sessions for update
using (public.user_is_box_staff(box_id))
with check (public.user_is_box_staff(box_id));
create policy "box staff delete class_sessions"
on public.class_sessions for delete
using (public.user_is_box_staff(box_id));

drop policy if exists "box staff write box_members" on public.box_members;
create policy "box staff insert box_members"
on public.box_members for insert
with check (public.user_is_box_staff(box_id));
create policy "box staff update box_members"
on public.box_members for update
using (public.user_is_box_staff(box_id))
with check (public.user_is_box_staff(box_id));
create policy "box staff delete box_members"
on public.box_members for delete
using (public.user_is_box_staff(box_id));

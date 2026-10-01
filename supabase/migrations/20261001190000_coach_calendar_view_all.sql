-- Fase E (última) of the new coach features batch: "Ver el calendario
-- completo del box" (solo lectura). A coach's SELECT on class_sessions
-- today is scoped to their OWN sessions only (coach_id = my_coach_id --
-- see 20261001120000_coach_permission_enforcement.sql's "Mis clases de
-- hoy" baseline), which is exactly the blocker: box-admin's full week/
-- month calendar UI (classes.tsx) already exists and needs no new screen,
-- it just needs this read widened. Write policies for class_sessions
-- (classes_create/classes_edit, scoped to the coach's own sessions) and
-- class_bookings (bookings_manage, same scoping) are completely untouched
-- -- a coach with this permission can SEE every class but still can't
-- touch another coach's.
--
-- Unlike every other permission in the catalog (off by default, since
-- they all grant some kind of write), this one defaults to TRUE for every
-- coach -- explicit product decision: it's read-only, low risk, and
-- useful for any coach coordinating with the rest of the team.
--
-- class_bookings' SELECT is widened the same way, not just
-- class_sessions': the calendar UI's capacity bars/roster counts come
-- from class_bookings, so leaving that scoped to "own sessions only"
-- would make every other coach's class look empty on this same calendar.
alter table public.coaches alter column permissions set default '{
  "classes_create": false,
  "classes_edit": false,
  "bookings_manage": true,
  "members_view": true,
  "members_edit": false,
  "finances_view": false,
  "payments_register": false,
  "files_manage": false,
  "community_post_as_box": true,
  "manual_achievements_manage": true,
  "wod_of_day_publish": true,
  "athlete_rank_assign": true,
  "calendar_view_all": true
}'::jsonb;

-- Backfill ONLY the new key into existing rows -- right-hand side of ||
-- wins on conflict, so every already-set key (including a coach whose
-- admin deliberately left some other permission off) stays untouched.
update public.coaches
set permissions = jsonb_build_object('calendar_view_all', true) || permissions
where not (permissions ? 'calendar_view_all');

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
  or public.user_has_box_permission(class_sessions.box_id, 'calendar_view_all')
);

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
  or public.user_has_box_permission(class_bookings.box_id, 'calendar_view_all')
);

-- Fase B of the new coach features batch: "Resumen de actividad propio" --
-- a coach needs to count medals THEY granted. awarded_by is a free-text
-- email snapshot (fine as an audit trail, but fragile to join on if a
-- coach's email ever changes) -- add a real FK to coaches instead.
--
-- Backfill is best-effort by email match against the CURRENT coaches.email
-- for historical rows; coach_id stays null wherever no match is found
-- (automatic achievements, admin-granted ones, or an awarded_by email that
-- no longer matches any coach) -- same "best-effort, never a hard
-- requirement" approach as this whole feature calls for.
alter table public.user_achievements add column if not exists coach_id text references public.coaches(id) on delete set null;

update public.user_achievements ua
set coach_id = c.id
from public.coaches c
where ua.coach_id is null
  and ua.awarded_by is not null
  and ua.box_id is not null
  and c.box_id = ua.box_id
  and lower(c.email) = lower(ua.awarded_by);

-- Writes: a coach can only ever attribute a grant to THEIR OWN coach row
-- (or none) -- my_coach_id(box_id) returns null for an admin (no coaches
-- row), so this also naturally keeps admin-granted medals coach_id-free
-- without a separate branch.
drop policy if exists "manage manual achievements (insert)" on public.user_achievements;
create policy "manage manual achievements (insert)"
on public.user_achievements for insert
with check (
  box_id is not null
  and public.user_has_box_permission(box_id, 'manual_achievements_manage')
  and coach_id is not distinct from public.my_coach_id(box_id)
);

-- Fase D of the new coach features batch: "Editar su propio perfil" --
-- photo, specialty, bio, phone. Until now a coach had ZERO write access to
-- `coaches` (closed deliberately in 20261001110000_coach_permissions_catalog
-- .sql, which found the old "box staff write coaches" policy let a coach
-- edit their own permissions/status at will -- a privilege-escalation
-- hole). This adds a narrow, separate self-update policy rather than
-- reopening that one: a coach may only ever touch name-tag/contact fields
-- (phone, specialty, bio, photo_url) on their OWN row, and the sensitive
-- columns (permissions, status, box_id, user_id, name, email) stay frozen
-- to their current value no matter what the update payload claims -- same
-- "freeze via a STABLE SECURITY DEFINER snapshot + IS NOT DISTINCT FROM in
-- WITH CHECK" idiom already used for class_sessions.coach_id and
-- box_members.plan_id/next_payment_at.
alter table public.coaches add column if not exists bio text;

create or replace function public.coach_current(_coach_id text)
returns public.coaches
language sql
stable
security definer
set search_path = 'public'
as $$
  select * from public.coaches where id = _coach_id;
$$;

create policy "coach edit own profile"
on public.coaches for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and box_id is not distinct from (select box_id from public.coach_current(id))
  and status is not distinct from (select status from public.coach_current(id))
  and permissions is not distinct from (select permissions from public.coach_current(id))
  and name is not distinct from (select name from public.coach_current(id))
  and email is not distinct from (select email from public.coach_current(id))
);

-- Storage: a coach may upload their own photo under coach-photos/{their
-- auth uid}/... -- same "wodplace-uploads" public bucket as everything
-- else (avatars, box logos), own-folder-only via the foldername check
-- (mirrors box-logos' admin-wide prefix, scoped here to one's own uid
-- instead since this is a personal photo, not a box-wide asset).
drop policy if exists "coach write own photo upload" on storage.objects;
create policy "coach write own photo upload" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'wodplace-uploads'
    and (storage.foldername(name))[1] = 'coach-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'wodplace-uploads'
    and (storage.foldername(name))[1] = 'coach-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

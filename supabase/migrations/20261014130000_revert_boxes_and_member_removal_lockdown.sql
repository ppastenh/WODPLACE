-- Reversa de 20261014120000_boxes_and_member_removal_lockdown.sql. Solo
-- correr a mano si algo se rompe después de aplicar esa migración.
-- STATUS: probada en rollback.

drop policy if exists "box admin delete box_members" on public.box_members;
create policy "box staff delete box_members" on public.box_members
  for delete
  using (public.user_is_box_staff(box_id));

drop policy if exists "super admin write boxes" on public.boxes;
drop policy if exists "box admin write boxes" on public.boxes;
create policy "box staff write boxes" on public.boxes
  for all
  using (public.user_is_box_staff(id))
  with check (public.user_is_box_staff(id));

drop function if exists public.box_owner_user_id(text);
drop function if exists public.box_status(text);

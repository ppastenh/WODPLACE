-- Reversa de 20261014160000_classes_wods_lockdown.sql. Solo correr a mano
-- si algo se rompe después de aplicar esa migración. STATUS: probada en
-- rollback.

drop policy if exists "wod permission write own wods" on public.wods;
create policy "box staff write own wods" on public.wods
  for all
  using (box_id is not null and public.user_is_box_staff(box_id))
  with check (box_id is not null and public.user_is_box_staff(box_id));

drop policy if exists "box admin write classes" on public.classes;
create policy "box staff write classes" on public.classes
  for all
  using (public.user_is_box_staff(box_id))
  with check (public.user_is_box_staff(box_id));

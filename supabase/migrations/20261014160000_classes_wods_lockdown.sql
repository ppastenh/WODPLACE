-- S3, barrido sistemático, Lote 2 (2026-10-14). STATUS: applied 2026-10-14.
--
-- classes (horario semanal recurrente del box): pasa a ser solo de
-- administrador/dueño/super admin -- a diferencia de class_sessions (las
-- clases ya programadas en el calendario), que sigue sin cambios, exige
-- classes_create/classes_edit del coach asignado.
--
-- wods (contenido de los WOD): pasa a exigir el permiso wod_of_day_publish
-- que ya existe -- mismo permiso que ya gobierna wod_of_day (el WOD del
-- día), para que ambas tablas queden bajo el mismo criterio.

drop policy if exists "box staff write classes" on public.classes;
create policy "box admin write classes" on public.classes
  for all
  using (public.user_is_box_admin_or_super_admin(box_id))
  with check (public.user_is_box_admin_or_super_admin(box_id));

drop policy if exists "box staff write own wods" on public.wods;
create policy "wod permission write own wods" on public.wods
  for all
  using (box_id is not null and public.user_has_box_permission(box_id, 'wod_of_day_publish'))
  with check (box_id is not null and public.user_has_box_permission(box_id, 'wod_of_day_publish'));

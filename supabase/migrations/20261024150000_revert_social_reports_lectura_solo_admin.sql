-- ============================================================================
-- Reversa de 20261024140000_social_reports_lectura_solo_admin.sql
-- Devuelve la política de lectura de social_reports a user_is_box_staff(box_id)
-- (staff del box, coaches incluidos), tal como estaba. Probada en una transacción
-- con ROLLBACK (la política queda idéntica a la original). Solo correr a mano si algo se rompe después de aplicar esa migración.
-- ============================================================================

begin;

drop policy if exists "box admin read social_reports" on public.social_reports;
create policy "box admin read social_reports" on public.social_reports
  for select to authenticated
  using (public.user_is_box_staff(box_id));

commit;

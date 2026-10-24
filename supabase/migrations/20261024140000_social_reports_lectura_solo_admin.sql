-- ============================================================================
-- social_reports: la lectura pasa de "staff" a administrador/dueño/super admin, por box
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run. APLICADA el 2026-10-24 a wiwpaekdykxernegicdv (rol postgres), con aprobación de Pía.
-- Parte 1 de F1 ("Reportes de Comunidad" en el panel). Aplicar a mano, como el resto de las migraciones.
-- Reversa: 20261024150000_revert_social_reports_lectura_solo_admin.sql (probada en una transacción con ROLLBACK).
--
-- Hallazgo (2026-10-24): la política de lectura "box admin read social_reports" usa
-- user_is_box_staff(box_id), que incluye a los COACHES del box. Un coach podía leer
-- los reportes de Comunidad (con el nombre de quien reportó) llamando directo a la
-- base, aunque ninguna pantalla se los muestra. Quién los lee hoy (revisado):
--   · panel (box-admin): admin-alerts.ts -> campana, solo si isAdmin;
--   · servidor (api-server): conexión de servicio, no depende de esta política;
--   · app del alumno: solo por el servidor;
--   · ninguna función, vista ni disparador de la base lee la tabla.
-- Ningún flujo legítimo de coach ni de alumno depende de esta lectura.
--
-- Cambio: SELECT solo con user_is_box_admin_or_super_admin(box_id) = administrador
-- (fila box_admin) de ESE box, o super admin (is_super_admin(): con el interruptor
-- aal2 encendido exige aal2). Es la misma condición que ya usa la política de
-- UPDATE (resolver). Las filas no se tocan. Aditivo e idempotente.
-- ============================================================================

begin;

drop policy if exists "box admin read social_reports" on public.social_reports;
create policy "box admin read social_reports" on public.social_reports
  for select to authenticated
  using (public.user_is_box_admin_or_super_admin(box_id));

commit;

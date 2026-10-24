-- ============================================================================
-- Reversa de 20261024120000_super_admin_audit_log_solo_super_admin.sql
-- Deja la tabla exactamente como estaba: política de INSERT para cualquier
-- administrador de box, sin disparador y con los privilegios originales.
-- Probada en una transacción con ROLLBACK (comparación de política y privilegios
-- antes/después). No se aplica sin aprobación de Pía.
-- ============================================================================

begin;

drop trigger if exists z_super_admin_audit_log_set_actor on public.super_admin_audit_log;
drop function if exists public.super_admin_audit_log_set_actor();

drop policy if exists "super admin insert audit log" on public.super_admin_audit_log;
drop policy if exists "admin insert audit log" on public.super_admin_audit_log;
create policy "admin insert audit log" on public.super_admin_audit_log
  for insert to authenticated
  with check (public.user_is_any_box_admin());

grant all on public.super_admin_audit_log to anon, authenticated;

commit;

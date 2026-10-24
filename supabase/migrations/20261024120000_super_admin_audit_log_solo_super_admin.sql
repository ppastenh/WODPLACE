-- ============================================================================
-- super_admin_audit_log: solo super admin escribe, el actor sale de la sesión
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run. APLICADA el 2026-10-24 a wiwpaekdykxernegicdv (rol postgres), con aprobación de Pía.
-- Verificada en producción con cuentas desechables (21 casos) y con check:super-admin-inlining y check:security-definer-grants antes y después.
-- Reversa: 20261024130000_revert_super_admin_audit_log_solo_super_admin.sql (probada en una transacción con ROLLBACK).
--
-- Hallazgo (2026-10-23): la política "admin insert audit log" deja insertar a
-- CUALQUIER administrador de box (user_is_any_box_admin()) y el actor
-- (actor_email) lo manda el navegador, así que se puede falsificar. Además
-- anon y authenticated tienen UPDATE/DELETE/TRUNCATE a nivel de privilegios
-- (hoy solo los frena RLS por no tener política).
--
-- Cambios:
--  1. INSERT solo con is_super_admin() (decide super admin SOLO esa función,
--     regla de CLAUDE.md; respeta el interruptor aal2).
--  2. Disparador BEFORE INSERT: si quien inserta es una sesión de usuario
--     (auth.uid() no es null), el actor, el id y la fecha los pone la base
--     desde la sesión, ignorando lo que mande el navegador. Si inserta el
--     servidor (conexión de servicio, auth.uid() es null) se respeta lo que
--     mande (el servidor es de confianza).
--  3. Privilegios: anon sin nada; authenticated solo SELECT e INSERT (se
--     quitan UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER).
-- Las filas existentes no se tocan. Aditivo e idempotente.
-- ============================================================================

begin;

-- 1. Solo super admin inserta
drop policy if exists "admin insert audit log" on public.super_admin_audit_log;
drop policy if exists "super admin insert audit log" on public.super_admin_audit_log;
create policy "super admin insert audit log" on public.super_admin_audit_log
  for insert to authenticated
  with check (public.is_super_admin());

-- 2. El actor sale de la sesión, nunca del navegador
create or replace function public.super_admin_audit_log_set_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if auth.uid() is not null then
    select u.email into v_email from auth.users u where u.id = auth.uid();
    new.actor_email := coalesce(v_email, 'desconocido');
    new.id := 'audit-' || gen_random_uuid()::text;
    new.created_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.super_admin_audit_log_set_actor() from public, anon, authenticated;

drop trigger if exists z_super_admin_audit_log_set_actor on public.super_admin_audit_log;
create trigger z_super_admin_audit_log_set_actor
  before insert on public.super_admin_audit_log
  for each row execute function public.super_admin_audit_log_set_actor();

-- 3. Solo agregar, también por privilegios
revoke all on public.super_admin_audit_log from anon;
revoke update, delete, truncate, references, trigger on public.super_admin_audit_log from authenticated;

commit;

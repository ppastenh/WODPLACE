-- ============================================================================
-- SUPER_ADMIN_AUDIT_LOG — append-only RLS  (proyecto WODPLACE / wiwpaekdykxernegicdv)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL
-- (the `postgres` role, BYPASSRLS — see 20260912120000_global_rls_hardening.sql
-- for why that's safe). This file is HISTORY, kept for reference only.
-- ----------------------------------------------------------------------------
-- `super_admin_audit_log` (table created via lib/db, see
-- lib/db/src/schema/wodplace.ts) is written and read directly by the
-- super-admin web app via the Supabase client, same as everything else in
-- that app — after every sensitive action (approve/reject a box,
-- grant/revoke a role, resolve a report, ...) it inserts a row; the Registro
-- de Auditoría screen reads it back the same way.
--
-- Reading is restricted to `is_super_admin()` specifically (stricter than
-- the `user_is_any_box_admin()` used elsewhere — a box_admin has no reason
-- to see platform-wide audit history). No UPDATE/DELETE policy exists at
-- all, for anyone — existing rows can never be changed or removed through
-- PostgREST, which is the "append-only" guarantee.
--
-- Caveat documented on the table itself (see the Drizzle schema comment):
-- this is a client-attested log, not server-enforced — a super_admin
-- session could still bypass the app and act without writing a row. Real
-- tamper-proof auditing would need every mutation to go through api-server
-- instead of direct-to-Supabase, which is a larger architectural change out
-- of scope here.
--
-- Aditivo e idempotente.
-- ============================================================================

begin;

alter table public.super_admin_audit_log enable row level security;

drop policy if exists "admin insert audit log" on public.super_admin_audit_log;
create policy "admin insert audit log" on public.super_admin_audit_log
  for insert to authenticated
  with check (public.user_is_any_box_admin());

drop policy if exists "super_admin read audit log" on public.super_admin_audit_log;
create policy "super_admin read audit log" on public.super_admin_audit_log
  for select to authenticated
  using (public.is_super_admin());

commit;

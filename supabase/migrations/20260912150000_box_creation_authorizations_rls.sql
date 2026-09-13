-- ============================================================================
-- BOX_CREATION_AUTHORIZATIONS — RLS  (proyecto WODPLACE / wiwpaekdykxernegicdv)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL
-- (the `postgres` role, BYPASSRLS). This file is HISTORY, kept for
-- reference only.
-- ----------------------------------------------------------------------------
-- `box_creation_authorizations` (table created via lib/db, see
-- lib/db/src/schema/wodplace.ts) is the pre-authorization gate for
-- "Crear mi Box": a super_admin adds an email here from their own panel
-- BEFORE that person can use the self-service box-creation flow at all.
-- Entirely super_admin territory — a box_admin never reads or writes this
-- table directly (api-server's own /create-box check goes through its
-- privileged DB connection, not PostgREST/RLS).
--
-- Aditivo e idempotente.
-- ============================================================================

begin;

alter table public.box_creation_authorizations enable row level security;

drop policy if exists "super_admin manage box creation authorizations" on public.box_creation_authorizations;
create policy "super_admin manage box creation authorizations" on public.box_creation_authorizations
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

commit;

-- ============================================================================
-- SUPPORT_REPORTS — RLS + Storage policy  (proyecto WODPLACE / wiwpaekdykxernegicdv)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL
-- (the `postgres` role, BYPASSRLS — see 20260912120000_global_rls_hardening.sql
-- for why that's safe). This file is HISTORY, kept for reference only.
-- ----------------------------------------------------------------------------
-- `support_reports` (table created via lib/db, see
-- lib/db/src/schema/wodplace.ts) replaces "Moderación Global" in the
-- super-admin panel: box_admins report bugs/problems in the app straight to
-- the platform owner (super_admin), NOT athlete moderation reports on
-- Comunidad content (those stay entirely inside box-admin's own local
-- moderation, untouched by this table or by super-admin).
--
-- A box_admin can insert only their own report and read only their own
-- (so they can track its status); super_admin can read and resolve all of
-- them. No DELETE policy for anyone — resolved reports stay as history,
-- same append-only spirit as super_admin_audit_log.
--
-- Aditivo e idempotente.
-- ============================================================================

begin;

alter table public.support_reports enable row level security;

drop policy if exists "box_admin insert own support report" on public.support_reports;
create policy "box_admin insert own support report" on public.support_reports
  for insert to authenticated
  with check (
    public.user_is_any_box_admin()
    and reporter_user_id = auth.uid()::text
  );

drop policy if exists "box_admin read own support report" on public.support_reports;
create policy "box_admin read own support report" on public.support_reports
  for select to authenticated
  using (
    reporter_user_id = auth.uid()::text
    or public.is_super_admin()
  );

drop policy if exists "super_admin resolve support report" on public.support_reports;
create policy "super_admin resolve support report" on public.support_reports
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Optional screenshot upload — same public "wodplace-uploads" bucket as
-- everything else, new "support/" prefix. The bucket is already public-read
-- at the bucket-settings level (see lib/objectStorage.ts), so only INSERT
-- needs a policy here; any box_admin or super_admin may write under this
-- prefix (not box-scoped like contracts/announcements, since a bug report
-- isn't tied to reading other boxes' data).
drop policy if exists "admin write support upload" on storage.objects;
create policy "admin write support upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wodplace-uploads'
    and (storage.foldername(name))[1] = 'support'
    and public.user_is_any_box_admin()
  );

commit;

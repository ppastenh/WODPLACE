-- Admin notification bell: read access for the tables it surfaces that don't
-- already have a "box staff" policy (social_reports, contract_acceptances).
--
-- These are admin-only signals — not "box staff" (which includes coaches),
-- but real admins (box_admin / super_admin). WODPLACE is single-box today,
-- and neither table carries a box_id (see contract_documents' comment), so
-- this checks "is an admin of any box" rather than a specific one, same
-- simplification already used elsewhere for these two tables.
--
-- Aditivo e idempotente — seguro de correr aunque estas políticas ya
-- existan o las tablas ya tuvieran RLS habilitado por otro lado.

create or replace function public.user_is_any_box_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('super_admin', 'box_admin')
  );
$$;

revoke all on function public.user_is_any_box_admin() from public, anon;
grant execute on function public.user_is_any_box_admin() to authenticated, service_role;

-- ── social_reports: pending-moderation count + inline resolve ──────────────
alter table public.social_reports enable row level security;

drop policy if exists "box admin read social_reports" on public.social_reports;
create policy "box admin read social_reports" on public.social_reports
  for select to authenticated
  using (public.user_is_any_box_admin());

drop policy if exists "box admin resolve social_reports" on public.social_reports;
create policy "box admin resolve social_reports" on public.social_reports
  for update to authenticated
  using (public.user_is_any_box_admin())
  with check (public.user_is_any_box_admin());

grant select, update on public.social_reports to authenticated;
grant all on public.social_reports to service_role;

-- ── contract_acceptances: unseen-by-owner count + mark-seen ────────────────
alter table public.contract_acceptances enable row level security;

drop policy if exists "box admin read contract_acceptances" on public.contract_acceptances;
create policy "box admin read contract_acceptances" on public.contract_acceptances
  for select to authenticated
  using (public.user_is_any_box_admin());

drop policy if exists "box admin mark seen contract_acceptances" on public.contract_acceptances;
create policy "box admin mark seen contract_acceptances" on public.contract_acceptances
  for update to authenticated
  using (public.user_is_any_box_admin())
  with check (public.user_is_any_box_admin());

grant select, update on public.contract_acceptances to authenticated;
grant all on public.contract_acceptances to service_role;

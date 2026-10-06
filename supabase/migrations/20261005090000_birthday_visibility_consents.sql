-- Minor birthday visibility consent — whether a minor's first name + day/
-- month (never year/age) may appear in the box's "Próximos cumpleaños".
-- A dedicated table rather than new columns on contract_acceptances:
-- contract_acceptances already has a box-staff (admin + coach, via
-- user_is_box_staff()) UPDATE policy for "mark seen", and Postgres RLS
-- can't restrict individual columns within a row — a coach with UPDATE
-- rights on the row could write any column, including a new one added
-- here. A separate table gets its own policy, admin-only, from scratch.
--
-- Self-service writes (the athlete's own device) and the "granted via
-- contract acceptance" path both go through api-server with a privileged
-- DB connection (bypassing RLS entirely, same as the rest of
-- contract_acceptances' write path) — api-server's own application code
-- enforces "self-service can only ever set consent=false" and "the
-- contract-acceptance path only grants on first acceptance, never a
-- later re-acceptance". RLS here exists specifically to gate the OTHER
-- path: box-admin's direct-to-Postgres write from the member's admin
-- screen. No policy at all is granted to a plain "authenticated" session
-- beyond that admin-scoped one — a coach, or an admin of a different box,
-- gets no matching policy and is rejected by Postgres itself.

create table public.birthday_visibility_consents (
  user_id text primary key references public.wodplace_users(id) on delete cascade,
  box_id text not null,
  consent boolean not null default false,
  granted_at timestamptz,
  source text check (source in ('contrato', 'admin')),
  granted_by_email text,
  text_version text,
  revoked_at timestamptz
);

alter table public.birthday_visibility_consents enable row level security;

-- Admin-of-THIS-box only — never a coach, never an admin of a different
-- box. Same shape as "admin update box_members" in
-- 20261001130000_coach_classes_members_edit_enforcement.sql, which is the
-- proven fix for the "admin of ANY box" class of bug found in
-- 20260914090000_critical_rls_lockdown.sql.
create policy "admin read birthday_visibility_consents"
on public.birthday_visibility_consents for select
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = birthday_visibility_consents.box_id))
  )
);

create policy "admin upsert birthday_visibility_consents"
on public.birthday_visibility_consents for insert
to authenticated
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = birthday_visibility_consents.box_id))
  )
);

create policy "admin update birthday_visibility_consents"
on public.birthday_visibility_consents for update
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = birthday_visibility_consents.box_id))
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = birthday_visibility_consents.box_id))
  )
);

revoke all on public.birthday_visibility_consents from anon, authenticated;
grant select, insert, update on public.birthday_visibility_consents to authenticated;
grant all on public.birthday_visibility_consents to service_role;

-- Closes a real gap found while building birthday_visibility_consents:
-- contract_acceptances' "mark seen" UPDATE policy used
-- user_is_box_staff(box_id) (admin OR coach), with no column
-- restriction — RLS is row-level, so a coach with UPDATE rights on the
-- row could rewrite ANY column via a crafted PostgREST request, not just
-- seen_by_owner_at (verified live, with rollback, before writing this:
-- a simulated coach successfully overwrote guardian_name and
-- accepted_at on a real row). These are legally-relevant acceptance
-- records, so both halves of the fix are needed:
--   1. Admin-of-this-box only, never a coach (same pattern already used
--      for box_members and birthday_visibility_consents).
--   2. Every column except seen_by_owner_at is frozen to its current
--      value, regardless of what the UPDATE payload contains — the
--      "freeze unless it's the one allowed field" trick already used
--      for box_members.plan_id/next_payment_at.
--
-- box-admin's own "mark seen" call already only ever sends
-- { seen_by_owner_at: ... } (see lib/admin-alerts.ts), so this doesn't
-- change its behavior — it just makes that restriction real at the
-- database level instead of only being true "because the UI happens to
-- only send that one field".

-- STABLE + security definer so it reads the row's CURRENT persisted
-- state, not whatever the in-flight UPDATE is trying to write.
create or replace function public.contract_acceptance_immutable_snapshot(_user_id text)
returns jsonb
language sql
stable
security definer
set search_path = 'public'
as $$
  select jsonb_build_object(
    'emergency_contact_name', emergency_contact_name,
    'emergency_contact_phone', emergency_contact_phone,
    'accepted_at', accepted_at,
    'guardian_name', guardian_name,
    'guardian_relationship', guardian_relationship,
    'minor_data_consent_at', minor_data_consent_at,
    'box_id', box_id
  )
  from public.contract_acceptances
  where user_id = _user_id;
$$;

revoke all on function public.contract_acceptance_immutable_snapshot(text) from public, anon;
grant execute on function public.contract_acceptance_immutable_snapshot(text) to authenticated, service_role;

drop policy if exists "box admin mark seen contract_acceptances" on public.contract_acceptances;

create policy "admin mark seen contract_acceptances"
on public.contract_acceptances for update
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = contract_acceptances.box_id))
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = contract_acceptances.box_id))
  )
  and jsonb_build_object(
    'emergency_contact_name', emergency_contact_name,
    'emergency_contact_phone', emergency_contact_phone,
    'accepted_at', accepted_at,
    'guardian_name', guardian_name,
    'guardian_relationship', guardian_relationship,
    'minor_data_consent_at', minor_data_consent_at,
    'box_id', box_id
  ) = public.contract_acceptance_immutable_snapshot(user_id)
);

-- STATUS: applied (dev DB, verified live with rollback-only transactions
-- before committing — see conversation notes / ESTADO.md).

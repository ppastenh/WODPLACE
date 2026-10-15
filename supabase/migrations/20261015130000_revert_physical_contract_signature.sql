-- Reversa de 20261015120000_physical_contract_signature.sql. Solo correr
-- a mano si algo se rompe después de aplicar esa migración. STATUS:
-- probada en rollback.

drop policy if exists "coach edit box_members" on public.box_members;
create policy "coach edit box_members" on public.box_members
  for update
  using (user_has_box_permission(box_id, 'members_edit'))
  with check (
    user_has_box_permission(box_id, 'members_edit')
    and not (plan_id is distinct from box_member_plan_id(box_id, user_id))
    and not (next_payment_at is distinct from box_member_next_payment_at(box_id, user_id))
  );

drop function if exists public.box_member_contract_signed_physically_at(text, text);
drop function if exists public.box_member_contract_signed_physically_by(text, text);

alter table public.box_members
  drop column if exists contract_signed_physically_at,
  drop column if exists contract_signed_physically_by;

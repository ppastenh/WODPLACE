-- Reversa de 20261015140000_box_members_emergency_contact.sql. Solo correr
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
    and not (contract_signed_physically_at is distinct from box_member_contract_signed_physically_at(box_id, user_id))
    and not (contract_signed_physically_by is distinct from box_member_contract_signed_physically_by(box_id, user_id))
  );

-- Restaura el SELECT de tabla simple y sin restriccion de columnas que
-- existia antes de esta migracion.
grant select on public.box_members to authenticated, anon;

drop function if exists public.box_member_emergency_contact(text, text);
drop function if exists private.box_member_emergency_contact_name(text, text);
drop function if exists private.box_member_emergency_contact_phone(text, text);

alter table public.box_members
  drop column if exists emergency_contact_name,
  drop column if exists emergency_contact_phone;

-- El esquema "private" se deja (podría tener otras funciones para
-- entonces); si quedara vacío, se puede borrar a mano con
-- `drop schema private;`.

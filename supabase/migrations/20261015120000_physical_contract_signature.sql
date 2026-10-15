-- Contrato de un menor sin cuenta, opción 1 (2026-10-15): un campo
-- administrativo "contrato firmado en físico", con quién lo marcó y
-- cuándo. Solo visible y editable por administrador, dueño o super
-- admin -- nunca un coach, ni con members_edit. STATUS: applied 2026-10-15.
--
-- NO reemplaza contract_acceptances ni su snapshot legal -- es solo una
-- constancia administrativa de que alguien firmó en papel. Su validez
-- legal la revisará la abogada de Pía antes de confiar en ella para
-- nada más que un registro interno.

alter table public.box_members
  add column contract_signed_physically_at timestamptz,
  add column contract_signed_physically_by uuid;

-- Mismo patrón que box_member_plan_id/box_member_next_payment_at: lee el
-- valor ACTUAL (bypass de RLS vía security definer) para poder congelar
-- la columna en el WITH CHECK de abajo sin bloquear ediciones de otros
-- campos cuando ya tiene un valor.
create or replace function public.box_member_contract_signed_physically_at(_box_id text, _user_id text)
returns timestamptz
language sql stable security definer set search_path = 'public'
as $$
  select contract_signed_physically_at from public.box_members
  where box_id = _box_id and user_id = _user_id
    and (
      user_is_box_staff(_box_id)
      or exists (select 1 from public.wodplace_users wu where wu.id = _user_id and wu.auth_user_id = auth.uid())
    );
$$;

create or replace function public.box_member_contract_signed_physically_by(_box_id text, _user_id text)
returns uuid
language sql stable security definer set search_path = 'public'
as $$
  select contract_signed_physically_by from public.box_members
  where box_id = _box_id and user_id = _user_id
    and (
      user_is_box_staff(_box_id)
      or exists (select 1 from public.wodplace_users wu where wu.id = _user_id and wu.auth_user_id = auth.uid())
    );
$$;

-- La política de coach ya congela plan_id/next_payment_at -- se agregan
-- estas dos columnas a la misma lista, mismo patrón.
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

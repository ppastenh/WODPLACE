-- S1.2 de la auditoría de seguridad (2026-10-13). STATUS: applied 2026-10-13.
--
-- (b) Agrega el chequeo de box/self que faltaba. Confirmado con datos
-- reales que filtraban: box_member_plan_id, box_member_next_payment_at
-- (fecha real de pago), contract_acceptance_immutable_snapshot (nombre y
-- TELÉFONO real de contacto de emergencia), coach_current (perfil
-- completo de un coach de otro box). session_coach_id no se pudo probar
-- con datos reales (ninguna sesión tiene coach asignado hoy) pero recibe
-- el mismo chequeo por el mismo patrón de riesgo.

create or replace function public.box_member_next_payment_at(_box_id text, _user_id text)
returns date
language sql stable security definer set search_path = 'public'
as $$
  select next_payment_at from public.box_members
  where box_id = _box_id and user_id = _user_id
    and (
      user_is_box_staff(_box_id)
      or exists (select 1 from public.wodplace_users wu where wu.id = _user_id and wu.auth_user_id = auth.uid())
    );
$$;

create or replace function public.box_member_plan_id(_box_id text, _user_id text)
returns text
language sql stable security definer set search_path = 'public'
as $$
  select plan_id from public.box_members
  where box_id = _box_id and user_id = _user_id
    and (
      user_is_box_staff(_box_id)
      or exists (select 1 from public.wodplace_users wu where wu.id = _user_id and wu.auth_user_id = auth.uid())
    );
$$;

create or replace function public.coach_current(_coach_id text)
returns coaches
language sql stable security definer set search_path = 'public'
as $$
  select * from public.coaches c
  where c.id = _coach_id
    and (user_is_box_staff(c.box_id) or c.user_id = auth.uid());
$$;

create or replace function public.session_coach_id(_session_id text)
returns text
language sql stable security definer set search_path = 'public'
as $$
  select cs.coach_id from public.class_sessions cs
  where cs.id = _session_id and user_is_box_staff(cs.box_id);
$$;

create or replace function public.contract_acceptance_immutable_snapshot(_user_id text)
returns jsonb
language sql stable security definer set search_path = 'public'
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
  where user_id = _user_id
    and (
      user_is_box_staff(box_id)
      or exists (select 1 from public.wodplace_users wu where wu.id = _user_id and wu.auth_user_id = auth.uid())
    );
$$;

-- (c) remove_coach_role: el email de auditoría ya no lo decide el
-- cliente -- se resuelve del auth.uid() real de quien está llamando. El
-- parámetro p_removed_by_email se mantiene por compatibilidad (el cliente
-- no necesita actualizarse) pero su VALOR se ignora.
create or replace function public.remove_coach_role(p_coach_id text, p_removed_by_email text)
returns coaches
language plpgsql security definer set search_path = 'public'
as $$
declare
  v_box_id text;
  v_user_id uuid;
  v_row public.coaches;
  v_real_email text;
begin
  select box_id, user_id into v_box_id, v_user_id
  from public.coaches
  where id = p_coach_id;

  if v_box_id is null then
    raise exception 'Coach % not found', p_coach_id;
  end if;

  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = v_box_id))
  ) then
    raise exception 'No autorizado para quitar el rol de este coach'
      using errcode = 'insufficient_privilege';
  end if;

  select email into v_real_email from auth.users where id = auth.uid();

  if v_user_id is not null then
    perform set_config('app.user_roles_guard_bypass', 'remove_coach_role', true);
    delete from public.user_roles
    where user_id = v_user_id and box_id = v_box_id and role = 'coach';
  end if;

  update public.coaches
  set status = 'inactivo',
      user_id = null,
      removed_at = now(),
      removed_by_email = v_real_email,
      updated_at = now()
  where id = p_coach_id
  returning * into v_row;

  return v_row;
end;
$$;

-- (d) Revoca EXECUTE de anon y public en todo salvo check_invite_code
-- (necesita seguir siendo pública: valida un código ANTES de tener
-- sesión). Las funciones que ayudan a las políticas RLS (se llaman con
-- el rol del usuario que hace la consulta) mantienen authenticated.
revoke execute on function public.box_member_next_payment_at(text, text) from anon, public;
revoke execute on function public.box_member_plan_id(text, text) from anon, public;
revoke execute on function public.coach_current(text) from anon, public;
revoke execute on function public.my_coach_id(text) from anon, public;
revoke execute on function public.session_coach_id(text) from anon, public;
revoke execute on function public.user_has_box_permission(text, text) from anon, public;
revoke execute on function public.remove_coach_role(text, text) from anon, public;
revoke execute on function public.update_coach_permissions(text, jsonb, text) from anon, public;
revoke execute on function public.replace_contract_document(text, text, text, text, text, text, boolean) from anon, public;
revoke execute on function public.delete_contract_document(text, text) from anon, public;
revoke execute on function public.contract_acceptance_immutable_snapshot(text) from anon, public;
revoke execute on function public.user_is_box_owner_or_super_admin(text) from anon, public;

-- Solo de trigger -- ningún camino legítimo las llama por REST. El
-- disparo del trigger no exige EXECUTE al invocador (corre como el dueño
-- de la función), así que revocar a TODOS los roles (incluido
-- authenticated) no rompe nada -- confirmado con una prueba después de
-- aplicar.
revoke execute on function public.enforce_admin_invites_expiry() from anon, authenticated, public;
revoke execute on function public.redeem_admin_invite() from anon, authenticated, public;
revoke execute on function public.guard_user_roles_writes() from anon, authenticated, public;
revoke execute on function public.sync_profile_from_auth() from anon, authenticated, public;

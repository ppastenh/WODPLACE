-- Reversa de 20261013120000_harden_security_definer_functions.sql. Solo
-- correr a mano si algo se rompe después de aplicar esa migración.
-- STATUS: probada en rollback.

create or replace function public.box_member_next_payment_at(_box_id text, _user_id text)
returns date language sql stable security definer set search_path = 'public'
as $$ select next_payment_at from public.box_members where box_id = _box_id and user_id = _user_id; $$;

create or replace function public.box_member_plan_id(_box_id text, _user_id text)
returns text language sql stable security definer set search_path = 'public'
as $$ select plan_id from public.box_members where box_id = _box_id and user_id = _user_id; $$;

create or replace function public.coach_current(_coach_id text)
returns coaches language sql stable security definer set search_path = 'public'
as $$ select * from public.coaches where id = _coach_id; $$;

create or replace function public.session_coach_id(_session_id text)
returns text language sql stable security definer set search_path = 'public'
as $$ select coach_id from public.class_sessions where id = _session_id; $$;

create or replace function public.contract_acceptance_immutable_snapshot(_user_id text)
returns jsonb language sql stable security definer set search_path = 'public'
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
  from public.contract_acceptances where user_id = _user_id;
$$;

create or replace function public.remove_coach_role(p_coach_id text, p_removed_by_email text)
returns coaches language plpgsql security definer set search_path = 'public'
as $$
declare
  v_box_id text; v_user_id uuid; v_row public.coaches;
begin
  select box_id, user_id into v_box_id, v_user_id from public.coaches where id = p_coach_id;
  if v_box_id is null then raise exception 'Coach % not found', p_coach_id; end if;
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = v_box_id))
  ) then
    raise exception 'No autorizado para quitar el rol de este coach' using errcode = 'insufficient_privilege';
  end if;
  if v_user_id is not null then
    perform set_config('app.user_roles_guard_bypass', 'remove_coach_role', true);
    delete from public.user_roles where user_id = v_user_id and box_id = v_box_id and role = 'coach';
  end if;
  update public.coaches set status = 'inactivo', user_id = null, removed_at = now(),
    removed_by_email = p_removed_by_email, updated_at = now()
  where id = p_coach_id returning * into v_row;
  return v_row;
end;
$$;

grant execute on function public.box_member_next_payment_at(text, text) to anon, authenticated;
grant execute on function public.box_member_plan_id(text, text) to anon, authenticated;
grant execute on function public.coach_current(text) to anon, authenticated;
grant execute on function public.my_coach_id(text) to anon, authenticated;
grant execute on function public.session_coach_id(text) to anon, authenticated;
grant execute on function public.user_has_box_permission(text, text) to anon, authenticated;
grant execute on function public.remove_coach_role(text, text) to anon, authenticated;
grant execute on function public.update_coach_permissions(text, jsonb, text) to anon, authenticated;
grant execute on function public.replace_contract_document(text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.delete_contract_document(text, text) to authenticated;
grant execute on function public.contract_acceptance_immutable_snapshot(text) to anon, authenticated;
grant execute on function public.user_is_box_owner_or_super_admin(text) to anon, authenticated;

grant execute on function public.enforce_admin_invites_expiry() to anon, authenticated;
grant execute on function public.redeem_admin_invite() to anon, authenticated;
grant execute on function public.guard_user_roles_writes() to anon, authenticated;
grant execute on function public.sync_profile_from_auth() to anon, authenticated;

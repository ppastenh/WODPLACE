-- Invitación de alumno por correo con código personal de un solo uso
-- (reemplaza "agregar con correo"). Fase 1: base de datos + función
-- atómica de reclamo. STATUS: applied 2026-10-15.
--
-- Mismo patrón y seguridad que la invitación de staff (admin_invites):
-- código al azar de 14 caracteres, vencimiento, un solo uso, límite de
-- intentos reusando la misma tabla invite_claim_attempts. A diferencia de
-- staff, la llave es SOLO el código -- no se exige que el correo de la
-- sesión coincida (las cuentas nacen sin verificar el correo, así que esa
-- coincidencia no aporta seguridad real y solo estorbaría si el alumno se
-- registra con un correo distinto al que el administrador escribió).

create table public.member_invites (
  id text primary key default gen_random_uuid()::text,
  box_id text not null references public.boxes(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and btrim(email) <> ''),
  full_name text,
  phone text,
  plan_id text references public.plans(id) on delete set null,
  code text not null unique,
  status text not null default 'pendiente' check (status in ('pendiente', 'usado', 'cancelado')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  used_at timestamptz,
  used_by uuid
);

-- Dos invitaciones PENDIENTES para el mismo correo en el mismo box no
-- tienen sentido -- una ya usada o cancelada no bloquea una nueva (ej.
-- reenviar después de cancelar, o un alumno que se fue y vuelve).
create unique index member_invites_pending_box_email_unique
  on public.member_invites (box_id, email)
  where status = 'pendiente';

alter table public.member_invites enable row level security;

create policy "box admin read member_invites" on public.member_invites
  for select
  using (public.user_is_box_admin_or_super_admin(box_id));

create policy "box admin write member_invites" on public.member_invites
  for all
  using (public.user_is_box_admin_or_super_admin(box_id))
  with check (public.user_is_box_admin_or_super_admin(box_id));

-- Reclamo atómico: todo o nada. Se llama con la identidad YA VERIFICADA
-- del servidor (requireSupabaseUser), nunca con un auth_user_id que mande
-- el cliente. No se expone por PostgREST (revoke de todos los roles al
-- final) -- solo la conexión de servicio de api-server puede llamarla.
--
-- Casos:
--   - código no existe / vencido / cancelado / usado por OTRA cuenta ->
--     excepción genérica "invalid_code" (el llamador la traduce a un
--     mensaje que no revela cuál fue el problema).
--   - usado por la MISMA cuenta que reclama otra vez -> idempotente,
--     responde éxito sin volver a escribir nada.
--   - la cuenta YA es miembro de ese box -> no duplica la fila de
--     box_members; igual aplica el plan/teléfono de la invitación si la
--     cuenta no tenía, marca la invitación usada, y devuelve
--     alreadyMember=true para que la app avise en vez de fallar.
--   - existe un "miembro agregado a mano" antiguo (wodplace_users sin
--     auth_user_id, mismo box, mismo correo en minúsculas) -> su fila de
--     box_members (plan, vencimiento, estado, teléfono) pasa a la cuenta
--     real; esa fila vieja de wodplace_users NO se borra automáticamente
--     (podría tener historial de pagos u otra referencia) -- queda
--     huérfana para que el administrador la revise y limpie a mano.
create or replace function public.claim_member_invite(_code text, _acting_auth_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = 'public'
as $$
declare
  v_invite record;
  v_wu_id text;
  v_placeholder_user_id text;
  v_already_member boolean := false;
begin
  select * into v_invite from public.member_invites where code = _code for update;
  if v_invite is null then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  if v_invite.status = 'usado' then
    if v_invite.used_by is distinct from _acting_auth_user_id then
      raise exception 'invalid_code' using errcode = 'P0001';
    end if;
    -- Reclamo repetido de la misma cuenta (ej. dos pestañas) -- idempotente.
    select id into v_wu_id from public.wodplace_users where auth_user_id = _acting_auth_user_id;
    return jsonb_build_object('boxId', v_invite.box_id, 'alreadyMember', true, 'reclaim', true);
  end if;

  if v_invite.status = 'cancelado' then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at <= now() then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  select id into v_wu_id from public.wodplace_users where auth_user_id = _acting_auth_user_id;
  if v_wu_id is null then
    raise exception 'no_profile' using errcode = 'P0001';
  end if;

  select bm.user_id into v_placeholder_user_id
  from public.wodplace_users wu
  join public.box_members bm on bm.user_id = wu.id and bm.box_id = v_invite.box_id
  where wu.auth_user_id is null and lower(wu.email) = v_invite.email
  limit 1;

  if exists (select 1 from public.box_members where box_id = v_invite.box_id and user_id = v_wu_id) then
    v_already_member := true;
    update public.box_members
    set plan_id = coalesce(v_invite.plan_id, plan_id),
        phone = coalesce(v_invite.phone, phone)
    where box_id = v_invite.box_id and user_id = v_wu_id;
  elsif v_placeholder_user_id is not null then
    update public.box_members
    set user_id = v_wu_id,
        plan_id = coalesce(v_invite.plan_id, plan_id)
    where box_id = v_invite.box_id and user_id = v_placeholder_user_id;
  else
    insert into public.box_members (box_id, user_id, status, plan_id, phone)
    values (v_invite.box_id, v_wu_id, 'activo', v_invite.plan_id, v_invite.phone);
  end if;

  update public.member_invites
  set status = 'usado', used_at = now(), used_by = _acting_auth_user_id
  where id = v_invite.id;

  return jsonb_build_object('boxId', v_invite.box_id, 'alreadyMember', v_already_member, 'reclaim', false);
end;
$$;

revoke all on function public.claim_member_invite(text, uuid) from public, anon, authenticated;

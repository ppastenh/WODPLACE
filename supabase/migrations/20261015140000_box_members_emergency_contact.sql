-- Contacto de emergencia para un miembro SIN cuenta (Fase 2 de invitación
-- de alumno, 2026-10-15): un miembro agregado sin cuenta nunca pasa por el
-- flujo de aceptación de contrato de la app (ahí es donde hoy se captura
-- emergency_contact_name/phone, ver contract_acceptances), así que el
-- gimnasio no tiene ningún dato de contacto de emergencia para él.
--
-- A diferencia de plan_id/next_payment_at/contract_signed_physically_*
-- (donde un coach SÍ puede ver el valor, solo no editarlo), este campo es
-- dato sensible de un tercero y Pía pidió que un coach no pueda LEERLO ni
-- por API directa, no solo escribirlo. Como la política de SELECT actual
-- de box_members es amplia (cualquiera con members_view o members_edit),
-- y el freeze de WITH CHECK para un coach necesita una función que lea el
-- valor actual -- función que, si viviera en el esquema "public" con
-- EXECUTE a "authenticated", PostgREST la expondría como RPC llamable
-- directo por ese mismo coach -- se resuelve con dos piezas separadas:
--
--   1. Las funciones de comparación para el freeze viven en un esquema
--      nuevo "private", que PostgREST NUNCA expone como REST/RPC (solo
--      expone "public" por defecto) -- siguen siendo llamables desde la
--      política porque eso es SQL puro, no una petición HTTP.
--   2. La única forma de LEER el valor es la función pública
--      box_member_emergency_contact(_box_id, _user_id), que solo
--      devuelve algo si quien llama es administrador/dueño/super admin
--      de ese box (nunca coach) -- esta sí es la que usa la ficha.
--   3. Las columnas quedan además con el SELECT de columna revocado para
--      authenticated/anon, así que ni siquiera un administrador puede
--      leerlas con un select() directo -- todo pasa por la función.
--
-- Ninguna pantalla existente selecciona estas columnas hoy (no existían),
-- así que nada se rompe por el revoke. STATUS: preparada, NO aplicada --
-- esperando OK explícito antes de correrla.

alter table public.box_members
  add column emergency_contact_name text,
  add column emergency_contact_phone text;

create schema if not exists private;
grant usage on schema private to authenticated;

-- Solo para el freeze de la política de coach -- nunca expuesta como RPC
-- (PostgREST solo expone el esquema "public" en este proyecto).
create or replace function private.box_member_emergency_contact_name(_box_id text, _user_id text)
returns text
language sql stable security definer set search_path = 'public'
as $$
  select emergency_contact_name from public.box_members
  where box_id = _box_id and user_id = _user_id;
$$;

create or replace function private.box_member_emergency_contact_phone(_box_id text, _user_id text)
returns text
language sql stable security definer set search_path = 'public'
as $$
  select emergency_contact_phone from public.box_members
  where box_id = _box_id and user_id = _user_id;
$$;

grant execute on function private.box_member_emergency_contact_name(text, text) to authenticated;
grant execute on function private.box_member_emergency_contact_phone(text, text) to authenticated;

-- Unica forma de LEER el contacto de emergencia -- usada por la ficha vía
-- RPC. Devuelve null si quien llama no es administrador/dueño/super admin
-- de ese box (nunca un coach, a diferencia de box_member_plan_id y
-- similares que sí revisan user_is_box_staff).
create or replace function public.box_member_emergency_contact(_box_id text, _user_id text)
returns jsonb
language sql stable security definer set search_path = 'public'
as $$
  select case when user_is_box_admin_or_super_admin(_box_id)
    then jsonb_build_object('name', emergency_contact_name, 'phone', emergency_contact_phone)
    else null
  end
  from public.box_members
  where box_id = _box_id and user_id = _user_id;
$$;

revoke execute on function public.box_member_emergency_contact(text, text) from public;
grant execute on function public.box_member_emergency_contact(text, text) to authenticated;

-- OJO: un REVOKE SELECT (columna) por si solo NO basta -- el GRANT SELECT
-- ON box_members (sin lista de columnas) que ya existe es un permiso de
-- tabla aparte, independiente, y sigue cubriendo TODAS las columnas
-- (incluidas las nuevas) aunque se revoque la columna puntual. Confirmado
-- en pruebas: hay que revocar el SELECT de tabla entero y reemplazarlo
-- por un GRANT explícito de columnas, sin las dos nuevas.
revoke select on public.box_members from authenticated, anon;
grant select (
  box_id, user_id, status, joined_at, phone, photo_url, notes, plan_id,
  next_payment_at, created_at, updated_at, new_member_seen_at, member_since,
  contract_signed_physically_at, contract_signed_physically_by
) on public.box_members to authenticated, anon;

-- Misma política de coach, ahora usando las funciones de "private" para
-- el freeze de estas dos columnas nuevas.
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
    and not (emergency_contact_name is distinct from private.box_member_emergency_contact_name(box_id, user_id))
    and not (emergency_contact_phone is distinct from private.box_member_emergency_contact_phone(box_id, user_id))
  );

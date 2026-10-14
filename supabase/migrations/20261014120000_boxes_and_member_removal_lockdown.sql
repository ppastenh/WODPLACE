-- S3 (hallazgos nuevos del barrido de finanzas, 2026-10-14). STATUS: applied 2026-10-14.
--
-- Decisión de Pía:
-- 1. boxes: solo administrador del box, dueño o super admin pueden
--    modificarlo -- ningún coach. owner_user_id y status quedan
--    congelados incluso para administrador/dueño: solo super admin puede
--    cambiarlos (mismo patrón de "congelar columnas" ya usado en
--    box_members para plan_id/next_payment_at).
-- 2. Eliminar un miembro (DELETE en box_members) pasa a ser solo de
--    administrador/dueño/super admin -- un coach no puede, ni con
--    permisos (a diferencia de UPDATE, que sí respeta members_edit).
--
-- Evidencia revisada antes de aplicar: owner_user_id nunca lo actualiza
-- ningún cliente (solo se asigna una vez, al crear el box, desde
-- api-server con la conexión de servicio, que de todas formas no pasa
-- por RLS); status solo lo cambia super-admin (aprobar/rechazar box);
-- box-admin solo edita photo_url desde Ajustes. Ninguno de esos caminos
-- toca las columnas congeladas, así que nada legítimo se rompe.

create or replace function public.box_owner_user_id(_box_id text)
returns uuid
language sql stable security definer set search_path = 'public'
as $$
  select owner_user_id from public.boxes where id = _box_id;
$$;

create or replace function public.box_status(_box_id text)
returns text
language sql stable security definer set search_path = 'public'
as $$
  select status from public.boxes where id = _box_id;
$$;

drop policy if exists "box staff write boxes" on public.boxes;

-- Super admin: sin restricciones (incluye poder cambiar owner_user_id/status).
create policy "super admin write boxes" on public.boxes
  for all
  using (is_super_admin())
  with check (is_super_admin());

-- Administrador/dueño del box: todo excepto owner_user_id y status.
create policy "box admin write boxes" on public.boxes
  for all
  using (user_is_box_admin_or_super_admin(id))
  with check (
    user_is_box_admin_or_super_admin(id)
    and not (owner_user_id is distinct from box_owner_user_id(id))
    and not (status is distinct from box_status(id))
  );

-- box_members: eliminar un miembro pasa a administrador/dueño/super admin
-- únicamente. INSERT y UPDATE no cambian (UPDATE ya exige members_edit
-- para coach, con plan_id/next_payment_at ya congelados ahí también).
drop policy if exists "box staff delete box_members" on public.box_members;

create policy "box admin delete box_members" on public.box_members
  for delete
  using (public.user_is_box_admin_or_super_admin(box_id));

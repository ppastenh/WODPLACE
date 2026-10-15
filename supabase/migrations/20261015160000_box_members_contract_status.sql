-- Etiqueta de contratos en Miembros/ficha (solo presentación, 2026-10-15):
-- no cambia box_members.status ni la lógica de reservas -- ver evidencia
-- del hueco real en ESTADO.md (8 de 9 miembros activos sin ninguna fila
-- en contract_acceptances). Una sola función para toda la lista de
-- Miembros (nada de una consulta por miembro). STATUS: preparada.
--
-- Reglas (aprobadas por Pía):
--   - "pendiente"/"al_dia": miembro CON cuenta, según los mismos
--     documentos y el mismo criterio que ya usa computePendingSlugs
--     (api-server, routes/contracts.ts) -- un documento cuenta como
--     pendiente si no hay fila en contract_read_progress para ese slug
--     (un reemplazo que exige re-aceptar borra esa fila, así que vuelve
--     a quedar pendiente solo).
--   - "papel"/"falta_papel": miembro SIN cuenta, según
--     contract_signed_physically_at.
--   - null (sin etiqueta): el box no tiene documentos de alumno, o la
--     persona es staff de ese box (administrador, coach o super admin).
--   - Sin fila alguna para quien llama si no es administrador/dueño/super
--     admin de ese box -- a diferencia de otras tablas de contrato
--     (legibles por cualquier staff), esta función es security definer y
--     decide su propia autorización, más restrictiva a propósito.
create or replace function public.box_members_contract_status(_box_id text)
returns table(user_id text, status text, pending_titles text[])
language sql stable security definer set search_path = 'public'
as $$
  with docs as (
    select slug, title from contract_documents
    where box_id = _box_id and audience = 'athlete'
  ),
  members as (
    select bm.user_id, wu.auth_user_id, bm.contract_signed_physically_at
    from box_members bm
    join wodplace_users wu on wu.id = bm.user_id
    where bm.box_id = _box_id
  )
  select
    m.user_id,
    case
      when exists (
        select 1 from user_roles ur
        where ur.user_id = m.auth_user_id
          and (ur.role = 'super_admin' or (ur.role in ('box_admin', 'coach') and ur.box_id = _box_id))
      ) then null
      when (select count(*) from docs) = 0 then null
      when m.auth_user_id is not null then
        case when exists (
          select 1 from docs d
          where not exists (
            select 1 from contract_read_progress crp
            where crp.user_id = m.user_id and crp.box_id = _box_id and crp.document_slug = d.slug
          )
        ) then 'pendiente' else 'al_dia' end
      else
        case when m.contract_signed_physically_at is not null then 'papel' else 'falta_papel' end
    end as status,
    case
      when exists (
        select 1 from user_roles ur
        where ur.user_id = m.auth_user_id
          and (ur.role = 'super_admin' or (ur.role in ('box_admin', 'coach') and ur.box_id = _box_id))
      ) then null
      when (select count(*) from docs) = 0 then null
      when m.auth_user_id is not null then
        array(
          select d.title from docs d
          where not exists (
            select 1 from contract_read_progress crp
            where crp.user_id = m.user_id and crp.box_id = _box_id and crp.document_slug = d.slug
          )
        )
      else null
    end as pending_titles
  from members m
  where user_is_box_admin_or_super_admin(_box_id);
$$;

revoke execute on function public.box_members_contract_status(text) from public, anon;
grant execute on function public.box_members_contract_status(text) to authenticated;

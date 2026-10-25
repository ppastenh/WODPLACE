-- ============================================================================
-- contract_acceptances: lectura solo para administrador/dueño/super admin, por box + lista sin datos sensibles
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run. APLICADA el 2026-10-25 a wiwpaekdykxernegicdv (rol postgres), con aprobación de Pía.
-- Parte 1 de F3 ("Contratos → Aceptaciones" en el panel). Aplicar a mano, como el resto de las migraciones.
-- Reversa: 20261025150000_revert_contract_acceptances_lectura_solo_admin.sql (probada en una transacción con ROLLBACK).
--
-- 1) Hallazgo (2026-10-25): "box admin read contract_acceptances" usa user_is_box_staff(box_id), que incluye a los
--    COACHES. Esa tabla guarda contacto de emergencia y datos del apoderado de cada alumno: un coach podía leerlos
--    llamando directo a la base. Ahora el SELECT usa user_is_box_admin_or_super_admin(box_id) (la misma condición
--    del UPDATE de "marcar visto"): administrador del box, dueño con su fila box_admin, o super admin (con el
--    interruptor aal2 encendido exige aal2).
--
--    EL ALUMNO NO SE VE AFECTADO: nunca tuvo una política propia sobre esta tabla (solo existían la de staff y la
--    de "marcar visto"). Su propia aceptación, el aviso de contratos pendientes de Inicio y el bloqueo de reservas
--    salen del servidor (api-server, conexión de servicio: GET /contracts/acceptance, POST /bookings), que no
--    depende de RLS, y de contract_read_progress / contract_documents, que esta migración no toca.
--
-- 2) Función box_contract_acceptances_list(_box_id): la LISTA de la pantalla "Aceptaciones de contratos". Devuelve
--    SOLO quién aceptó, qué documento y versión, y cuándo (más si ya se marcó visto). NO devuelve contacto de
--    emergencia ni datos del apoderado (esos están en la ficha del miembro). Es SECURITY DEFINER para poder
--    mostrar el título del documento a administradores que no son el dueño (contract_documents/versions solo las
--    lee el dueño); verifica por dentro user_is_box_admin_or_super_admin(_box_id) y devuelve 0 filas si no.
-- Aditivo e idempotente.
-- ============================================================================

begin;

drop policy if exists "box admin read contract_acceptances" on public.contract_acceptances;
create policy "box admin read contract_acceptances" on public.contract_acceptances
  for select to authenticated
  using (public.user_is_box_admin_or_super_admin(box_id));

create or replace function public.box_contract_acceptances_list(_box_id text)
returns table (
  user_id text,
  member_name text,
  accepted_at timestamptz,
  seen boolean,
  document_slug text,
  document_title text,
  version_date timestamptz,
  version_superseded boolean,
  read_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select a.user_id,
         w.name,
         a.accepted_at,
         (a.seen_by_owner_at is not null),
         p.document_slug,
         coalesce(v.title, d.title),
         v.created_at,
         (v.superseded_at is not null),
         p.read_at
  from public.contract_acceptances a
  left join public.wodplace_users w on w.id = a.user_id
  left join public.contract_read_progress p on p.user_id = a.user_id and p.box_id = a.box_id
  left join public.contract_document_versions v on v.id = p.document_version_id
  left join public.contract_documents d on d.box_id = a.box_id and d.slug = p.document_slug
  where a.box_id = _box_id
    and public.user_is_box_admin_or_super_admin(_box_id)
  order by a.accepted_at desc, p.document_slug;
$$;

revoke all on function public.box_contract_acceptances_list(text) from public, anon;
grant execute on function public.box_contract_acceptances_list(text) to authenticated;

commit;

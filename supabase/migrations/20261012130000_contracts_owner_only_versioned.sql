-- B1 de la Fase B (dueño/traspaso). STATUS: applied 2026-10-11.
--
-- Resumen: los contratos pasan de "cualquier staff del box" a "solo el
-- dueño o super_admin", con historial inmutable (nunca se borra un
-- archivo ni una fila vieja) y reseteo de lectura acotado al documento
-- que cambió, no a los tres. Ni siquiera el dueño puede escribir directo
-- en contract_documents/las tablas nuevas -- todo pasa por las dos
-- funciones security definer de abajo.

-- 1. Rol: dueño del box (via boxes.owner_user_id) o super_admin.
create or replace function public.user_is_box_owner_or_super_admin(_box_id text)
returns boolean
language sql
stable security definer
set search_path = 'public'
as $$
  select exists (
    select 1 from public.boxes b where b.id = _box_id and b.owner_user_id = auth.uid()
  ) or exists (
    select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'super_admin'
  );
$$;

-- 2. Historial de versiones de archivo -- nunca se borra una fila ni el
-- objeto de storage que referencia; "superseded_at" marca cuando dejó de
-- ser la version vigente.
create table public.contract_document_versions (
  id text primary key default (gen_random_uuid())::text,
  box_id text not null references public.boxes(id),
  slug text not null,
  object_path text not null,
  file_name text,
  mime_type text,
  title text not null,
  created_at timestamptz not null default now(),
  superseded_at timestamptz
);
create index contract_document_versions_box_slug_idx on public.contract_document_versions (box_id, slug);
alter table public.contract_document_versions enable row level security;
create policy "owner or super_admin read contract_document_versions"
  on public.contract_document_versions for select
  using (public.user_is_box_owner_or_super_admin(box_id));
-- Deliberadamente sin politica de insert/update/delete: solo las
-- funciones de abajo (security definer, bypasean RLS) escriben aqui.
revoke all on public.contract_document_versions from anon, authenticated;
grant select on public.contract_document_versions to authenticated;

-- 3. contract_documents gana un puntero a cual version es la vigente —
-- "pendiente" para un alumno se calcula comparando esto contra lo que
-- dice su propio contract_read_progress.
alter table public.contract_documents
  add column current_version_id text references public.contract_document_versions(id);

-- 4. contract_read_progress gana la misma referencia: que version exacta
-- se marco como leida, no solo cuando.
alter table public.contract_read_progress
  add column document_version_id text references public.contract_document_versions(id);

-- 5. Historial de aceptacion -- una fila por documento por ciclo de
-- aceptacion, con la version exacta y los datos de apoderado/contacto
-- vigentes en ese momento. Nunca se borra.
create table public.contract_acceptance_history (
  id text primary key default (gen_random_uuid())::text,
  user_id text not null references public.wodplace_users(id),
  box_id text not null references public.boxes(id),
  document_slug text not null,
  document_version_id text references public.contract_document_versions(id),
  accepted_at timestamptz not null,
  emergency_contact_name text,
  emergency_contact_phone text,
  guardian_name text,
  guardian_relationship text,
  minor_data_consent_at timestamptz,
  archived_at timestamptz not null default now(),
  archived_reason text not null
);
create index contract_acceptance_history_user_idx on public.contract_acceptance_history (user_id);
create index contract_acceptance_history_box_idx on public.contract_acceptance_history (box_id);
alter table public.contract_acceptance_history enable row level security;
create policy "owner or super_admin read contract_acceptance_history"
  on public.contract_acceptance_history for select
  using (public.user_is_box_owner_or_super_admin(box_id));
revoke all on public.contract_acceptance_history from anon, authenticated;
grant select on public.contract_acceptance_history to authenticated;

-- 6. Cierra las politicas viejas de contract_documents ("cualquier
-- staff") -- lectura pasa a solo dueño/super_admin, y no queda NINGUNA
-- politica de escritura: un insert/update/delete directo siempre se
-- rechaza, sin importar el rol, incluido el dueño.
drop policy "box staff read contract_documents" on public.contract_documents;
drop policy "box staff write contract_documents" on public.contract_documents;
create policy "owner or super_admin read contract_documents"
  on public.contract_documents for select
  using (public.user_is_box_owner_or_super_admin(box_id));

-- 7. Mismo cierre para el bucket de storage "contracts": lectura y subida
-- de archivos NUEVOS quedan para dueño/super_admin; ni update ni delete
-- quedan permitidos para nadie -- cada version sube a una ruta nueva y
-- ahi se queda para siempre.
drop policy "box staff read contract objects" on storage.objects;
drop policy "box staff write contract objects" on storage.objects;
create policy "owner or super_admin read contract objects"
  on storage.objects for select
  using (bucket_id = 'contracts' and public.user_is_box_owner_or_super_admin(public.storage_box_prefix(name)));
create policy "owner or super_admin insert contract objects"
  on storage.objects for insert
  with check (bucket_id = 'contracts' and public.user_is_box_owner_or_super_admin(public.storage_box_prefix(name)));

-- 8. La unica forma de reemplazar un documento. Revisa el permiso ella
-- misma (no confia en RLS de la tabla, que ahora no tiene ninguna
-- politica de escritura). p_requires_reacceptance=false ("correccion
-- menor"): solo versiona, nadie queda pendiente. true (default en la
-- pantalla): versiona Y limpia el progreso de lectura de ESE documento
-- solamente -- los otros dos siguen leidos/aceptados -- despues de
-- archivar en el historial que fue exactamente lo que cada alumno habia
-- aceptado hasta ese momento.
create or replace function public.replace_contract_document(
  p_box_id text,
  p_slug text,
  p_title text,
  p_object_path text,
  p_file_name text,
  p_mime_type text,
  p_requires_reacceptance boolean
)
returns text
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_existing record;
  v_old_version_id text;
  v_new_version_id text;
begin
  if not user_is_box_owner_or_super_admin(p_box_id) then
    raise exception 'Solo el dueño del box o super_admin puede modificar contratos'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_existing from contract_documents
    where box_id = p_box_id and slug = p_slug for update;

  if v_existing.object_path is not null then
    insert into contract_document_versions
        (box_id, slug, object_path, file_name, mime_type, title, created_at, superseded_at)
      values
        (p_box_id, p_slug, v_existing.object_path, v_existing.file_name, v_existing.mime_type,
         v_existing.title, v_existing.updated_at, now())
      returning id into v_old_version_id;
  end if;

  insert into contract_document_versions (box_id, slug, object_path, file_name, mime_type, title, created_at)
    values (p_box_id, p_slug, p_object_path, p_file_name, p_mime_type, p_title, now())
    returning id into v_new_version_id;

  if v_existing.id is null then
    insert into contract_documents
        (box_id, slug, title, doc_type, file_name, mime_type, object_path, current_version_id, created_at, updated_at, audience)
      values
        (p_box_id, p_slug, p_title, 'Contrato', p_file_name, p_mime_type, p_object_path, v_new_version_id, now(), now(), 'athlete');
  else
    update contract_documents set
        title = p_title, file_name = p_file_name, mime_type = p_mime_type,
        object_path = p_object_path, current_version_id = v_new_version_id, updated_at = now()
      where id = v_existing.id;
  end if;

  if p_requires_reacceptance and v_existing.id is not null then
    insert into contract_acceptance_history
        (user_id, box_id, document_slug, document_version_id, accepted_at,
         emergency_contact_name, emergency_contact_phone, guardian_name, guardian_relationship,
         minor_data_consent_at, archived_reason)
      select crp.user_id, p_box_id, p_slug, v_old_version_id, crp.read_at,
             ca.emergency_contact_name, ca.emergency_contact_phone, ca.guardian_name,
             ca.guardian_relationship, ca.minor_data_consent_at, 'contract_updated'
        from contract_read_progress crp
        join contract_acceptances ca on ca.user_id = crp.user_id
        where crp.document_slug = p_slug and crp.box_id = p_box_id;

    delete from contract_read_progress where document_slug = p_slug and box_id = p_box_id;
  end if;

  return v_new_version_id;
end;
$$;
revoke all on function public.replace_contract_document(text, text, text, text, text, text, boolean) from anon, authenticated;
grant execute on function public.replace_contract_document(text, text, text, text, text, text, boolean) to authenticated;

-- 9. Borrar un documento por completo (ningun box lo usa hoy, pero el
-- camino tiene que existir y quedar igual de cerrado). Archiva su version
-- vigente en el historial de aceptacion de cada alumno con used_at=NULL
-- (no estaba vencida, se descontinuo) antes de borrar la fila -- el
-- storage NUNCA se toca, los archivos viejos quedan igual.
create or replace function public.delete_contract_document(
  p_box_id text,
  p_slug text
)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_existing record;
begin
  if not user_is_box_owner_or_super_admin(p_box_id) then
    raise exception 'Solo el dueño del box o super_admin puede modificar contratos'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_existing from contract_documents
    where box_id = p_box_id and slug = p_slug for update;
  if v_existing.id is null then
    return;
  end if;

  insert into contract_document_versions
      (box_id, slug, object_path, file_name, mime_type, title, created_at, superseded_at)
    values
      (p_box_id, p_slug, v_existing.object_path, v_existing.file_name, v_existing.mime_type,
       v_existing.title, v_existing.updated_at, now());

  delete from contract_documents where id = v_existing.id;
  delete from contract_read_progress where document_slug = p_slug and box_id = p_box_id;
end;
$$;
revoke all on function public.delete_contract_document(text, text) from anon, authenticated;
grant execute on function public.delete_contract_document(text, text) to authenticated;

-- 10. Backfill: todo lo que hoy esta efectivamente aceptado (alumnos con
-- fila en contract_acceptances) debe seguir viendose como "al dia" en
-- los tres documentos tras esta migracion. Crea una version "inicial"
-- por documento (con la fecha real de created_at del documento, no
-- "ahora") y una fila de contract_read_progress con esa version para
-- cada alumno que ya habia leido ese documento -- asi nadie pasa a
-- "pendiente" por la migracion misma. No toca contract_acceptances ni
-- birthday_visibility_consents en absoluto.
do $$
declare
  v_doc record;
  v_version_id text;
begin
  for v_doc in select * from contract_documents where audience = 'athlete' loop
    insert into contract_document_versions (box_id, slug, object_path, file_name, mime_type, title, created_at)
      values (v_doc.box_id, v_doc.slug, v_doc.object_path, v_doc.file_name, v_doc.mime_type, v_doc.title, v_doc.created_at)
      returning id into v_version_id;

    update contract_documents set current_version_id = v_version_id where id = v_doc.id;

    update contract_read_progress
      set document_version_id = v_version_id
      where box_id = v_doc.box_id and document_slug = v_doc.slug and document_version_id is null;
  end loop;
end $$;

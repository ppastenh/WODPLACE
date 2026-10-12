-- Reversa de B1a + B1 (Fase B). NO es una migración más: existe para
-- correrla a mano, una sola vez, SOLO si algo sale mal después de aplicar
-- 20261012120000_contract_documents_scope_by_box.sql y
-- 20261012130000_contracts_owner_only_versioned.sql. Deja la base
-- exactamente como estaba antes de esas dos. STATUS: probada en una
-- transacción con rollback (aplica B1a+B1, corre esto, verifica que el
-- esquema volvió a su forma original, y hace rollback de todo).
--
-- Dos chequeos de seguridad antes de tocar nada: si para entonces ya
-- existen datos que el esquema viejo no podría representar (más de un box
-- con el mismo slug, o el mismo usuario con progreso de lectura del mismo
-- slug en más de un box), esto se detiene con una excepción clara en vez
-- de perder o mezclar datos en silencio -- hay que resolverlo a mano antes
-- de poder revertir.
do $$
declare
  v_dupe_slug record;
  v_dupe_progress record;
begin
  select slug, count(distinct box_id) as box_count
    into v_dupe_slug
    from public.contract_documents
    group by slug
    having count(distinct box_id) > 1
    limit 1;
  if v_dupe_slug.slug is not null then
    raise exception 'No se puede revertir: el slug % ya existe en más de un box (la PK vieja (slug) no puede representar eso). Resuélvelo a mano antes de revertir.', v_dupe_slug.slug;
  end if;

  select user_id, document_slug, count(distinct box_id) as box_count
    into v_dupe_progress
    from public.contract_read_progress
    group by user_id, document_slug
    having count(distinct box_id) > 1
    limit 1;
  if v_dupe_progress.user_id is not null then
    raise exception 'No se puede revertir: el usuario % ya tiene progreso de lectura del documento % en más de un box (el índice viejo (user_id, document_slug) no puede representar eso). Resuélvelo a mano antes de revertir.', v_dupe_progress.user_id, v_dupe_progress.document_slug;
  end if;
end $$;

-- ===== Reversa de B1 (orden inverso al de esa migración) =====

drop function if exists public.delete_contract_document(text, text);
drop function if exists public.replace_contract_document(text, text, text, text, text, text, boolean);

drop policy if exists "owner or super_admin insert contract objects" on storage.objects;
drop policy if exists "owner or super_admin read contract objects" on storage.objects;
create policy "box staff read contract objects"
  on storage.objects for select
  using ((bucket_id = 'contracts'::text) and user_is_box_staff(storage_box_prefix(name)));
create policy "box staff write contract objects"
  on storage.objects for all
  using ((bucket_id = 'contracts'::text) and user_is_box_staff(storage_box_prefix(name)))
  with check ((bucket_id = 'contracts'::text) and user_is_box_staff(storage_box_prefix(name)));

drop policy if exists "owner or super_admin read contract_documents" on public.contract_documents;
create policy "box staff read contract_documents"
  on public.contract_documents for select
  using (user_is_box_staff(box_id));
create policy "box staff write contract_documents"
  on public.contract_documents for all
  using (user_is_box_staff(box_id))
  with check (user_is_box_staff(box_id));

drop table if exists public.contract_acceptance_history;

-- Both columns below hold FKs into contract_document_versions — they have
-- to go before that table can be dropped.
alter table public.contract_read_progress drop column if exists document_version_id;
alter table public.contract_documents drop column if exists current_version_id;

drop table if exists public.contract_document_versions;

drop function if exists public.user_is_box_owner_or_super_admin(text);

-- ===== Reversa de B1a (orden inverso al de esa migración) =====

alter table public.contract_read_progress
  drop constraint if exists contract_read_progress_box_slug_fkey;
drop index if exists public.contract_read_progress_user_box_doc_idx;

alter table public.contract_documents drop constraint contract_documents_pkey;
alter table public.contract_documents add constraint contract_documents_pkey primary key (slug);

alter table public.contract_read_progress
  add constraint contract_read_progress_document_slug_contract_documents_slug_fk
  foreign key (document_slug) references public.contract_documents (slug) on delete cascade;
create unique index contract_read_progress_user_doc_idx
  on public.contract_read_progress (user_id, document_slug);

-- El Acuerdo de Plataforma vuelve a contract_documents (audience='platform')
-- tal como estaba antes de B1a. Si por error ya hay más de una fila en
-- platform_agreement_document (no debería pasar nunca, es un singleton),
-- toma la más reciente y avisa por NOTICE en vez de fallar en silencio.
do $$
declare
  v_row record;
  v_count int;
begin
  select count(*) into v_count from public.platform_agreement_document;
  if v_count > 1 then
    raise notice 'platform_agreement_document tenía % filas (debería ser 0 o 1) -- se usa la más reciente por updated_at.', v_count;
  end if;

  select * into v_row from public.platform_agreement_document order by updated_at desc limit 1;
  if v_row.id is not null then
    insert into public.contract_documents (slug, box_id, title, object_path, updated_at, audience)
      values (
        'platform-agreement',
        (select id from public.boxes order by created_at limit 1),
        v_row.title, v_row.object_path, v_row.updated_at, 'platform'
      );
  end if;
end $$;

drop table if exists public.platform_agreement_document;

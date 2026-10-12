-- B1a de la Fase B: corrige un bug preexistente (no introducido por esta
-- tarea) encontrado al probar B1 con mas de un box. STATUS: applied 2026-10-11.
--
-- contract_documents tenia PRIMARY KEY (slug) -- unica en TODO el
-- sistema, no por box. Efecto real: solo el primer box que llamo
-- ensureDefaultDocuments() (hoy, el box "Mi Box") tiene filas reales;
-- cualquier otro box que lo intente choca contra el slug ya usado y
-- ensureDefaultDocuments lo descarta en silencio (onConflictDoNothing).
-- Box 3 tiene alumnos reales y 2 de ellos ya tienen una fila de
-- aceptacion pese a que Box 3 nunca tuvo documentos propios -- eso no se
-- toca aqui, sigue siendo valido (nada que comparar, nada pendiente).

-- 1. El Acuerdo de Plataforma nunca fue "por box" -- es un documento
-- unico entre WODPLACE y cada box_admin. El bug de PK global lo hacia
-- funcionar como si fuera unico "por casualidad"; separarlo a su propia
-- tabla antes de que contract_documents pase a ser realmente por box.
create table public.platform_agreement_document (
  id text primary key default (gen_random_uuid())::text,
  title text not null,
  object_path text,
  file_name text,
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.platform_agreement_document (title, object_path, file_name, mime_type, created_at, updated_at)
  select title, object_path, file_name, mime_type, created_at, updated_at
  from public.contract_documents
  where slug = 'platform-agreement'
  limit 1;
delete from public.contract_documents where slug = 'platform-agreement';

-- 2. contract_read_progress apunta a contract_documents.slug solo --
-- pasa a apuntar a (box_id, slug) junto con su indice unico.
alter table public.contract_read_progress
  drop constraint contract_read_progress_document_slug_contract_documents_slug_fk;
drop index public.contract_read_progress_user_doc_idx;

-- 3. PK compuesta real.
alter table public.contract_documents drop constraint contract_documents_pkey;
alter table public.contract_documents add constraint contract_documents_pkey primary key (box_id, slug);

alter table public.contract_read_progress
  add constraint contract_read_progress_box_slug_fkey
  foreign key (box_id, document_slug) references public.contract_documents (box_id, slug) on delete cascade;
create unique index contract_read_progress_user_box_doc_idx
  on public.contract_read_progress (user_id, box_id, document_slug);

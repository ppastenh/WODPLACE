-- ============================================================================
-- WODPLACE — Port del panel de administración (crossfit-dash-pro)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv via the Supabase SQL Editor (2026-08-30).
-- This file is HISTORY, kept for reference only. See supabase/README.md.
-- ----------------------------------------------------------------------------
-- Este archivo NO se aplica por el CLI (el repo no está conectado a WODPLACE
-- por migraciones). Se pega y se corre UNA vez en el SQL Editor de Supabase
-- del proyecto WODPLACE (wiwpaekdykxernegicdv).
--
-- Todo es ADITIVO e IDEMPOTENTE: CREATE ... IF NOT EXISTS, ADD COLUMN IF NOT
-- EXISTS, DROP POLICY IF EXISTS antes de cada CREATE POLICY. Correrla dos
-- veces no rompe nada. No borra ni renombra columnas existentes.
--
-- Decisiones aplicadas: D1-B (box_members), D2-A (class_sessions),
-- D3-A (columnas livianas en contract_documents).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Helpers de autorización por box
-- ----------------------------------------------------------------------------
-- IMPORTANTE sobre tipos en WODPLACE:
--   boxes.id (y por lo tanto TODA columna box_id) es TEXT
--     (se creó como  id text primary key default gen_random_uuid()::text  —
--      contiene un uuid pero la columna es text).
--   user_roles.user_id es UUID y referencia auth.users(id): vos, box_admins y
--     coaches son cuentas reales de Supabase Auth, así que auth.uid() matchea.
--
-- Staff del box = super_admin (cualquier box) | box_admin/coach del box dado.
-- SECURITY DEFINER para poder leer user_roles sin recursión de RLS.
create or replace function public.user_is_box_staff(_box_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and (
        ur.role = 'super_admin'
        or (ur.box_id = _box_id and ur.role in ('box_admin', 'coach'))
      )
  );
$$;

revoke all on function public.user_is_box_staff(text) from public, anon;
grant execute on function public.user_is_box_staff(text) to authenticated, service_role;

-- Primer segmento de la ruta de un objeto de storage como box_id (text), o
-- NULL si la ruta no empieza con "<uuid-shaped>/...". El panel sube los
-- archivos bajo el prefijo del box (ver secciones de código del porteo).
create or replace function public.storage_box_prefix(_name text)
returns text
language sql
stable
as $$
  select case
    when (storage.foldername(_name))[1] ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (storage.foldername(_name))[1]
    else null
  end;
$$;

revoke all on function public.storage_box_prefix(text) from public, anon;
grant execute on function public.storage_box_prefix(text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 1. Defaults de id que faltan (el panel inserta sin pasar id)
-- ----------------------------------------------------------------------------
-- El tipo real de estas columnas id (text vs uuid) depende de cómo se creó la
-- tabla en WODPLACE; se detecta y se usa el default correcto.
do $$
declare
  t text;
  is_text boolean;
begin
  foreach t in array array['admin_invites', 'class_bookings'] loop
    select data_type = 'text' into is_text
    from information_schema.columns
    where table_schema = 'public' and table_name = t and column_name = 'id';

    execute format(
      'alter table public.%I alter column id set default %s',
      t,
      case when is_text then 'gen_random_uuid()::text' else 'gen_random_uuid()' end
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 2. D1-B — box_members: metadata de membresía por (box, usuario)
-- ----------------------------------------------------------------------------
-- box_id es TEXT (boxes.id es text). user_id también es TEXT: los socios son
-- alumnos de la app móvil (wodplace_users.id lo genera el celular, no es UUID)
-- y todavía no tienen cuenta de Supabase Auth.
create table if not exists public.box_members (
  box_id          text not null references public.boxes(id) on delete cascade,
  user_id         text not null references public.wodplace_users(id) on delete cascade,
  status          text not null default 'activo',
  joined_at       date not null default (now() at time zone 'utc'),
  phone           text,
  photo_url       text,
  notes           text,
  plan_id         text references public.plans(id) on delete set null,
  next_payment_at date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (box_id, user_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'box_members_status_check'
  ) then
    alter table public.box_members
      add constraint box_members_status_check
      check (status in ('activo', 'pausado', 'suspendido', 'vencido', 'bloqueado'));
  end if;
end $$;

create index if not exists box_members_box_id_idx      on public.box_members (box_id);
create index if not exists box_members_user_id_idx     on public.box_members (user_id);
create index if not exists box_members_next_payment_idx on public.box_members (box_id, next_payment_at);

alter table public.box_members enable row level security;

drop policy if exists "box staff read box_members"   on public.box_members;
drop policy if exists "box staff write box_members"   on public.box_members;
create policy "box staff read box_members" on public.box_members
  for select to authenticated
  using (public.user_is_box_staff(box_id));
create policy "box staff write box_members" on public.box_members
  for all to authenticated
  using (public.user_is_box_staff(box_id))
  with check (public.user_is_box_staff(box_id));

grant select, insert, update, delete on public.box_members to authenticated;
grant all on public.box_members to service_role;

-- ----------------------------------------------------------------------------
-- 3. D2-A — class_sessions: ocurrencias con fecha
-- ----------------------------------------------------------------------------
-- classes queda intacta (plantilla semanal que usa la app de alumnos).
-- Una sesión puede referenciar una plantilla (class_id) o ser ad-hoc; por eso
-- name/level/capacity/coach viven también acá.
-- id / box_id / class_id / coach_id son TEXT (siguen la convención de WODPLACE:
-- text primary key default gen_random_uuid()::text).
create table if not exists public.class_sessions (
  id               text primary key default gen_random_uuid()::text,
  box_id           text not null references public.boxes(id) on delete cascade,
  class_id         text references public.classes(id) on delete set null,
  name             text not null,
  session_date     date not null,
  start_time       time not null,
  duration_minutes integer not null default 60,
  capacity         integer not null default 15,
  coach_id         text references public.coaches(id) on delete set null,
  level            text not null default 'todos',
  status           text not null default 'programada',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'class_sessions_status_check') then
    alter table public.class_sessions
      add constraint class_sessions_status_check
      check (status in ('programada', 'en_curso', 'finalizada', 'cancelada'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'class_sessions_level_check') then
    alter table public.class_sessions
      add constraint class_sessions_level_check
      check (level in ('todos', 'principiante', 'intermedio', 'avanzado'));
  end if;
end $$;

create index if not exists class_sessions_box_date_idx on public.class_sessions (box_id, session_date);
create index if not exists class_sessions_class_id_idx  on public.class_sessions (class_id);

alter table public.class_sessions enable row level security;

drop policy if exists "box staff read class_sessions"  on public.class_sessions;
drop policy if exists "box staff write class_sessions"  on public.class_sessions;
create policy "box staff read class_sessions" on public.class_sessions
  for select to authenticated
  using (public.user_is_box_staff(box_id));
create policy "box staff write class_sessions" on public.class_sessions
  for all to authenticated
  using (public.user_is_box_staff(box_id))
  with check (public.user_is_box_staff(box_id));

grant select, insert, update, delete on public.class_sessions to authenticated;
grant all on public.class_sessions to service_role;

-- NOTA (pendiente de decisión, NO incluido acá):
-- No se agrega FK class_bookings.session_id -> class_sessions.id para no
-- arriesgar el flujo de reservas de la app de alumnos. El panel trata
-- class_bookings.session_id como class_sessions.id por convención.
create index if not exists class_bookings_session_id_idx on public.class_bookings (session_id);

-- ----------------------------------------------------------------------------
-- 4. admin_invites — funcionalidad real de invitaciones
-- ----------------------------------------------------------------------------
alter table public.admin_invites
  add column if not exists code       text,
  add column if not exists expires_at timestamptz,
  add column if not exists used_at    timestamptz,
  add column if not exists used_by    uuid,
  add column if not exists created_by uuid;

create unique index if not exists admin_invites_code_key
  on public.admin_invites (code) where code is not null;

-- ----------------------------------------------------------------------------
-- 5. announcements — foto, push, banner, expiración
-- ----------------------------------------------------------------------------
alter table public.announcements
  add column if not exists image_url   text,
  add column if not exists send_push   boolean not null default true,
  add column if not exists show_banner boolean not null default true,
  add column if not exists banner_days integer not null default 3,
  add column if not exists expires_at  timestamptz,
  add column if not exists created_by  uuid;

-- ----------------------------------------------------------------------------
-- 6. announcement_reads — tracking de lectura (campana)
-- ----------------------------------------------------------------------------
-- announcement_id / box_id son TEXT. user_id es UUID: el lector es una cuenta
-- de Supabase Auth (staff que ve la campana en el panel).
create table if not exists public.announcement_reads (
  announcement_id text not null references public.announcements(id) on delete cascade,
  box_id          text not null references public.boxes(id) on delete cascade,
  user_id         uuid not null,
  read_at         timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcement_reads enable row level security;

drop policy if exists "user manages own announcement_reads" on public.announcement_reads;
create policy "user manages own announcement_reads" on public.announcement_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.announcement_reads to authenticated;
grant all on public.announcement_reads to service_role;

-- ----------------------------------------------------------------------------
-- 7. plans — duración, beneficios, flags
-- ----------------------------------------------------------------------------
alter table public.plans
  add column if not exists duration_days integer not null default 30,
  add column if not exists benefits      text[]  not null default '{}',
  add column if not exists is_active     boolean not null default true,
  add column if not exists is_featured   boolean not null default false,
  add column if not exists description   text,
  add column if not exists updated_at    timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- 8. payments — método y notas
-- ----------------------------------------------------------------------------
alter table public.payments
  add column if not exists method text,
  add column if not exists notes  text;

-- ----------------------------------------------------------------------------
-- 9. coaches — vínculo de cuenta, permisos, estado
-- ----------------------------------------------------------------------------
alter table public.coaches
  add column if not exists user_id     uuid,
  add column if not exists permissions jsonb not null default '{
    "classes_create": false,
    "classes_edit": false,
    "attendance_mark": true,
    "bookings_manage": true,
    "members_view": true,
    "members_edit": false,
    "prs_manage": true,
    "finances_view": false,
    "payments_register": false,
    "files_manage": false
  }'::jsonb,
  add column if not exists status    text not null default 'activo',
  add column if not exists specialty text,
  add column if not exists photo_url text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists coaches_user_id_idx on public.coaches (user_id);

-- ----------------------------------------------------------------------------
-- 10. D3-A — contract_documents: metadata liviana de archivo
-- ----------------------------------------------------------------------------
-- PK actual (slug o (box_id,slug)) queda igual. id es solo una clave estable
-- extra para el panel. contract_read_progress se usa como señal de "aceptado".
alter table public.contract_documents
  add column if not exists id         text not null default gen_random_uuid()::text,
  add column if not exists file_name  text,
  add column if not exists mime_type  text,
  add column if not exists doc_type   text not null default 'Contrato',
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists contract_documents_id_key
  on public.contract_documents (id);

-- ----------------------------------------------------------------------------
-- 11. wodplace_users — permitir alta desde el panel
-- ----------------------------------------------------------------------------
-- El panel puede crear un usuario nuevo al dar de alta un socio. La identidad
-- global la sigue "poseyendo" la app móvil; esto solo habilita el alta manual.
drop policy if exists "box staff can insert wodplace_users" on public.wodplace_users;
create policy "box staff can insert wodplace_users" on public.wodplace_users
  for insert to authenticated
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('super_admin', 'box_admin', 'coach')
    )
  );

grant insert on public.wodplace_users to authenticated;

-- ----------------------------------------------------------------------------
-- 12. Storage buckets usados por el panel
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('announcements', 'announcements', false)
on conflict (id) do nothing;

-- Aislado por box: los objetos se guardan bajo "<box_id>/..." y solo el staff
-- de ESE box puede leer/escribir. Rutas sin prefijo de box válido quedan
-- denegadas (storage_box_prefix devuelve NULL -> user_is_box_staff(NULL) es
-- false salvo super_admin).
drop policy if exists "box staff read contract objects"    on storage.objects;
drop policy if exists "box staff write contract objects"    on storage.objects;
drop policy if exists "box staff read announcement objects" on storage.objects;
drop policy if exists "box staff write announcement objects" on storage.objects;

create policy "box staff read contract objects" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'contracts'
    and public.user_is_box_staff(public.storage_box_prefix(name))
  );
create policy "box staff write contract objects" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'contracts'
    and public.user_is_box_staff(public.storage_box_prefix(name))
  )
  with check (
    bucket_id = 'contracts'
    and public.user_is_box_staff(public.storage_box_prefix(name))
  );

create policy "box staff read announcement objects" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'announcements'
    and public.user_is_box_staff(public.storage_box_prefix(name))
  );
create policy "box staff write announcement objects" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'announcements'
    and public.user_is_box_staff(public.storage_box_prefix(name))
  )
  with check (
    bucket_id = 'announcements'
    and public.user_is_box_staff(public.storage_box_prefix(name))
  );

commit;

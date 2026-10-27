-- ============================================================================
-- Reversa de 20261027_borrar_admin_pins.sql: recrea public.admin_pins VACÍA, con la misma forma que tenía
-- (columnas, llave primaria, llave foránea con borrado en cascada, RLS activada y sin políticas, sin permisos para
-- anon ni authenticated; solo postgres y service_role). Los hashes de PIN antiguos no se recuperan: el PIN del
-- servidor no se reutiliza (el PIN de la app es un candado local).
-- ============================================================================

begin;

create table public.admin_pins (
  user_id         text primary key references public.wodplace_users(id) on delete cascade,
  pin_hash        text not null,
  failed_attempts integer not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.admin_pins enable row level security;

revoke all on table public.admin_pins from public, anon, authenticated;
grant all on table public.admin_pins to postgres, service_role;

commit;

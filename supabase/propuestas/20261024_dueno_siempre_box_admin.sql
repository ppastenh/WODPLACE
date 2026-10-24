-- ============================================================================
-- PROPUESTA — NO APLICADA — el dueño de un box siempre tiene su fila box_admin
-- ----------------------------------------------------------------------------
-- STATUS: propuesta (2026-10-24). Pía decidió aplicarla JUNTO CON las migraciones de F5.
-- Reversa: 20261024_dueno_siempre_box_admin.reversa.sql
-- Matriz de pruebas (transacción con ROLLBACK): ver LEEME.md de esta carpeta.
--
-- Por qué: la base reconoce a un administrador por su fila box_admin en user_roles, no
-- por ser dueño (boxes.owner_user_id). "Aprobar box" ya crea esa fila y hoy los 3 boxes
-- existentes la tienen, pero nada lo garantiza: un dueño sin la fila vería vacías las
-- pantallas protegidas por user_is_box_admin_or_super_admin (por ejemplo los reportes).
--
-- Qué hace:
--  1. Al crear un box o cambiar su dueño, crea la fila box_admin del dueño si falta.
--  2. Impide borrar o cambiar la fila box_admin de quien es dueño de ese box (hay que
--     traspasar el box primero). Si se borra el box entero, el borrado en cascada de
--     sus roles sigue funcionando (el box ya no existe cuando se evalúa).
-- Aditivo e idempotente. No rellena boxes antiguos (todos tienen ya su fila).
-- ============================================================================

begin;

create or replace function public.boxes_ensure_owner_box_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_user_id is not null then
    insert into public.user_roles (id, user_id, role, box_id)
    values (gen_random_uuid()::text, new.owner_user_id, 'box_admin', new.id)
    on conflict (user_id, role, box_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.boxes_ensure_owner_box_admin() from public, anon, authenticated;

drop trigger if exists z_boxes_ensure_owner_box_admin on public.boxes;
create trigger z_boxes_ensure_owner_box_admin
  after insert or update of owner_user_id on public.boxes
  for each row execute function public.boxes_ensure_owner_box_admin();

create or replace function public.user_roles_protect_owner_box_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'box_admin'
     and (tg_op = 'DELETE'
          or old.role is distinct from new.role
          or old.box_id is distinct from new.box_id
          or old.user_id is distinct from new.user_id)
     and exists (select 1 from public.boxes b where b.id = old.box_id and b.owner_user_id = old.user_id)
  then
    raise exception 'No se puede quitar el rol box_admin al dueño del box; primero traspasa el box.'
      using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.user_roles_protect_owner_box_admin() from public, anon, authenticated;

drop trigger if exists z_user_roles_protect_owner_box_admin on public.user_roles;
create trigger z_user_roles_protect_owner_box_admin
  before update or delete on public.user_roles
  for each row execute function public.user_roles_protect_owner_box_admin();

commit;

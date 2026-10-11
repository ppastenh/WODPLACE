-- STATUS: APLICADA (OK explicito de Pia). Probada en vivo tras aplicar:
-- reclamo con cuenta nueva y con cuenta existente (ambos otorgan el rol
-- correctamente), e insert con expires_at nulo rechazado por el trigger.
--
-- Reemplaza el intento anterior (CHECK contra created_at): ese constraint
-- habria roto "Reenviar" (el vencimiento nuevo se calcula desde AHORA, no
-- desde la creacion de la invitacion) y habria fallado de inmediato contra
-- filas existentes sin expiracion. En vez de eso, un trigger que evalua la
-- regla en el momento de escribir (insert, o update que cambie expires_at):
-- debe estar definido y no superar 30 dias desde ese momento. No revisa
-- filas existentes que no se vuelvan a tocar -- las 5 invitaciones de hoy
-- ya cumplen la regla (verificado: ninguna con expires_at nulo ni mayor a
-- 30 dias desde su creacion), asi que no hace falta remediar nada.
--
-- box-admin crea y reenvia invitaciones con un insert/update directo contra
-- Supabase (RLS-gated, sin pasar por api-server), asi que el limite tiene
-- que vivir en la base, no solo en la pantalla.
create or replace function public.enforce_admin_invites_expiry()
returns trigger
language plpgsql
as $$
begin
  if new.expires_at is null or new.expires_at > now() + interval '30 days' then
    raise exception 'expires_at debe estar definido y no superar 30 dias desde ahora';
  end if;
  return new;
end;
$$;

create trigger admin_invites_expiry_cap
  before insert or update of expires_at on public.admin_invites
  for each row execute function public.enforce_admin_invites_expiry();

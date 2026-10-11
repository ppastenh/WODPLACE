-- STATUS: APLICADA (OK explícito de Pía). Probado en vivo tras aplicar:
-- signUp con invite_code en los metadatos ya no otorga ningún rol (la
-- invitación queda sin usar); POST /invites/claim sigue funcionando igual.
--
-- Hasta aplicar esto, el trigger viejo
-- (redeem_admin_invite, 20261001100000_admin_invite_redemption.sql:53-109)
-- sigue otorgando el rol directo si alguien manda invite_code en los
-- metadatos de auth.signUp — eludiendo el endpoint nuevo y su límite de
-- intentos. El cliente (box-admin) ya deja de mandar ese metadato en este
-- mismo commit, pero el trigger en la base seguiría aceptándolo si algo
-- (otro cliente, una llamada directa a la API de Supabase) lo mandara.
--
-- Esta migración deja el trigger instalado (por si algo más lo usa como
-- gancho más adelante) pero le quita toda la lógica que otorga el rol —
-- queda como no-operación.

create or replace function public.redeem_admin_invite()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  -- Desactivado a propósito: el otorgamiento de rol por invitación ahora
  -- pasa solo por POST /invites/claim (api-server), con límite de
  -- intentos y auditoría. Ver 20261011093000_redeem_admin_invite_trigger_disabled.sql.
  return new;
end;
$$;

-- STATUS: APLICADA.

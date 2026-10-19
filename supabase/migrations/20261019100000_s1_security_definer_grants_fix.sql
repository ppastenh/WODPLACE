-- Security Advisor de Supabase (2026-10-19): 12 funciones SECURITY DEFINER
-- tenían EXECUTE para anon (todas las nuevas lo heredan por el default de
-- Postgres -- EXECUTE ON FUNCTIONS se otorga a PUBLIC por defecto). Fugas
-- reales confirmadas con la API pública antes de aplicar esto, ver
-- ESTADO.md: app_setting_bool (sin chequeo interno, leía cualquier clave
-- de app_settings) y box_owner_user_id (sin chequeo interno, devolvía el
-- owner_user_id real de cualquier box). Las demás ya tenían chequeo
-- interno o eran funciones de trigger no invocables por RPC.
--
-- STATUS: aplicada en producción el 2026-10-19 (vía conexión de servicio,
-- sin archivo hasta ahora -- este archivo documenta lo ya aplicado).
-- Probada la reversa en una transacción con ROLLBACK.

-- 11 de las 12 (check_invite_code se revoca aparte más abajo, tras
-- confirmar que ningún cliente ni endpoint la llama directo).
revoke execute on function public.app_setting_bool(text) from anon, public;
revoke execute on function public.app_settings_audit_trigger() from anon, public, authenticated;
revoke execute on function public.box_member_contract_signed_physically_at(text, text) from anon, public;
revoke execute on function public.box_member_contract_signed_physically_by(text, text) from anon, public;
revoke execute on function public.box_member_emergency_contact(text, text) from anon, public;
revoke execute on function public.box_owner_user_id(text) from anon, public;
revoke execute on function public.box_status(text) from anon, public;
revoke execute on function public.current_wodplace_user_id() from anon, public;
revoke execute on function public.enforce_payment_box_consistency() from anon, public, authenticated;
revoke execute on function public.is_aal2_enforced() from anon, public;
revoke execute on function public.user_is_box_admin_or_super_admin(text) from anon, public;

-- app_setting_bool: confirmado por grep en wodplace/box-admin/super-admin/
-- api-server y por pg_policies que NADA la llama directo -- solo
-- internamente is_aal2_enforced()/is_super_admin() (llamada anidada entre
-- funciones SECURITY DEFINER, no necesita el EXECUTE del llamador
-- original). Segura de cerrar también para authenticated.
revoke execute on function public.app_setting_bool(text) from authenticated;

-- check_invite_code: confirmado por grep completo que ningún cliente ni
-- endpoint la llama (POST /invites/check consulta admin_invites directo
-- vía Drizzle, nunca esta función) -- sin caller legítimo, se cierra del
-- todo.
revoke execute on function public.check_invite_code(text, text) from anon, authenticated, public;

-- Restauración: confirmado con pg_policies que "boxes", "payments",
-- "plans", "box_settings", "classes", "member_invites", "coaches",
-- "class_bookings", "class_sessions" y "member_requests" llaman
-- user_is_box_admin_or_super_admin DIRECTO en su USING/WITH CHECK --
-- revocarle EXECUTE a anon rompía que una lectura sin sesión en esas
-- tablas devolviera vacío con gracia (tiraba 401 "permission denied for
-- function" en vez de 200 []). Segura de restaurar: solo informa del
-- propio llamador (auth.uid()), nunca de otra cuenta.
grant execute on function public.user_is_box_admin_or_super_admin(text) to anon;

-- Causa de raíz: EXECUTE ON FUNCTIONS se otorga a PUBLIC por defecto en
-- Postgres. Un primer intento CON "IN SCHEMA public" no funcionó (probado
-- creando una función nueva en rollback: seguía naciendo abierta, aun
-- viéndose "revocada" en pg_default_acl) -- la version SIN "IN SCHEMA"
-- (global para el rol) sí funciona, verificada igual.
alter default privileges for role postgres revoke execute on functions from public;

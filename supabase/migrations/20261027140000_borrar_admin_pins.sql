-- ============================================================================
-- F7-d: borra la tabla public.admin_pins (el PIN antiguo del servidor)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run. APLICADA el 2026-10-27 a wiwpaekdykxernegicdv (rol postgres), con aprobación de Pía (sin respaldo de los hashes, a pedido suyo).
-- Reversa: 20261027150000_revert_borrar_admin_pins.sql (recrea la tabla VACÍA; probada en una transacción con ROLLBACK).
--
-- Por qué: era el PIN por cuenta del panel de administración, validado por el servidor. Desde F7-a2 (404281d) el PIN es un
-- candado LOCAL del teléfono y desde F7-b1 (bcd6131) ninguna ruta del servidor lee ni escribe esta tabla. Estado
-- verificado el 2026-10-26: 2 filas (solo hashes de PIN antiguos, que no se reutilizan), RLS activada, 0 políticas,
-- sin vistas, funciones, políticas ni otras tablas que dependan de ella (solo su propia llave foránea a wodplace_users).
--
-- Sin CASCADE a propósito: si algo dependiera de la tabla, este comando falla en vez de borrar de más.
-- Reversa: 20261027150000_revert_borrar_admin_pins.sql (recrea la tabla VACÍA; los hashes no se recuperan ni hace falta).
-- Antes de aplicar se corrieron check:super-admin-inlining y check:security-definer-grants (obligatorios en migraciones).
-- ============================================================================

begin;

drop table public.admin_pins;

commit;

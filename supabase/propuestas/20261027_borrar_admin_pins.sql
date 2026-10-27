-- ============================================================================
-- F7-d (PROPUESTA, NO APLICADA): borra la tabla public.admin_pins.
--
-- Por qué: era el PIN por cuenta del panel de administración, validado por el servidor. Desde F7-a2 (404281d) el PIN es un
-- candado LOCAL del teléfono y desde F7-b1 (bcd6131) ninguna ruta del servidor lee ni escribe esta tabla. Estado
-- verificado el 2026-10-26: 2 filas (solo hashes de PIN antiguos, que no se reutilizan), RLS activada, 0 políticas,
-- sin vistas, funciones, políticas ni otras tablas que dependan de ella (solo su propia llave foránea a wodplace_users).
--
-- Sin CASCADE a propósito: si algo dependiera de la tabla, este comando falla en vez de borrar de más.
-- Reversa: 20261027_borrar_admin_pins.reversa.sql (recrea la tabla VACÍA; los hashes no se recuperan ni hace falta).
-- Antes de aplicar: correr check:super-admin-inlining y check:security-definer-grants (obligatorios en migraciones).
-- Solo se aplica con el OK de Pía.
-- ============================================================================

begin;

drop table public.admin_pins;

commit;

-- ============================================================================
-- REVERSA de 20261024_dueno_siempre_box_admin.sql — NO APLICADA
-- Quita los dos disparadores y sus funciones. No borra ninguna fila de user_roles
-- (las filas box_admin que el disparador haya creado quedan: son legítimas).
-- Probada en una transacción con ROLLBACK (disparadores y funciones desaparecen).
-- ============================================================================

begin;

drop trigger if exists z_user_roles_protect_owner_box_admin on public.user_roles;
drop function if exists public.user_roles_protect_owner_box_admin();

drop trigger if exists z_boxes_ensure_owner_box_admin on public.boxes;
drop function if exists public.boxes_ensure_owner_box_admin();

commit;

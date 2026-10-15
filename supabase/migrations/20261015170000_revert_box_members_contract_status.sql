-- Reversa de 20261015160000_box_members_contract_status.sql. Solo correr
-- a mano si algo se rompe después de aplicar esa migración. STATUS:
-- probada en rollback.

drop function if exists public.box_members_contract_status(text);

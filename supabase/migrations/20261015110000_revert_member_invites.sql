-- Reversa de 20261015100000_member_invites.sql. Solo correr a mano si algo
-- se rompe después de aplicar esa migración. STATUS: probada en rollback.

drop function if exists public.claim_member_invite(text, uuid);
drop table if exists public.member_invites;

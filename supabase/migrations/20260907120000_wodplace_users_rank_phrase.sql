-- STATUS: applied — to wiwpaekdykxernegicdv via the Supabase SQL Editor
-- (2026-09-10). History, do not re-run (statements are idempotent anyway).
--
-- Athlete self-expression fields, shown on the public member profile
-- (Comunidad / box-admin's "Ver perfil") alongside avatar_url: rank is a
-- fun/social level tag (Beginner..Elite), phrase is a short self-written
-- bio line. Neither was ever synced to the backend before — they lived
-- only in the mobile app's local AsyncStorage. Deliberately NOT syncing
-- `status` ("Cuenta Activa/Inactiva") here — that reads as account
-- standing, same category as payments/contracts, which stay private.
alter table public.wodplace_users
  add column if not exists rank text,
  add column if not exists phrase text;

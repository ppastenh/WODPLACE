-- STATUS: applied — do not re-run
--
-- New wodplace_users rows (whether inserted by box-admin's "Agregar
-- miembro" or upserted by wodplace's syncUser) now start at 'beginner'
-- automatically at the DB level, instead of relying on client-side logic
-- to push it after the fact (removed from AuthContext — rank is pulled
-- from the server now, never pushed, since it's coach-assigned).
alter table public.wodplace_users
  alter column rank set default 'beginner';

-- STATUS: applied — do not re-run
--
-- Fase 2 of the auth migration.
--
-- 1. Unique constraint on email — enforced going forward now that the
--    3 pre-existing duplicate-email cases (mock-era test accounts) were
--    manually resolved and cleaned up first. POST /auth/register checks
--    this proactively (same friendly "ya existe una cuenta" message as
--    always) so the raw constraint violation is never what the user sees.
--
-- 2. wodplace_users.phone — mock accounts never persisted this
--    server-side (client-only, lost on reinstall). Real accounts
--    (POST /auth/register) start persisting it for real, closing that gap
--    while already touching this exact area.
alter table public.wodplace_users
  add constraint wodplace_users_email_unique unique (email);

alter table public.wodplace_users
  add column phone text;

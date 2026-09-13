-- ============================================================================
-- BOXES — welcome_shown_at  (proyecto WODPLACE / wiwpaekdykxernegicdv)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL
-- (the `postgres` role). This file is HISTORY, kept for reference only.
-- ----------------------------------------------------------------------------
-- Tracks whether the one-time "your box is approved" welcome popup (shown
-- on wodplace's Home screen, see app/home.tsx) has already been shown for
-- this box_admin. A durable server-side flag rather than local device
-- storage, so it stays correct across reinstalls/other devices — set once,
-- via POST /platform-agreement/box-welcome-shown, right when the popup is
-- displayed.
--
-- Aditivo e idempotente.
-- ============================================================================

begin;

alter table public.boxes
  add column if not exists welcome_shown_at timestamptz;

commit;

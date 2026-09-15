-- ============================================================================
-- PLANS — classes_per_period  (proyecto WODPLACE / wiwpaekdykxernegicdv)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL
-- (the `postgres` role). This file is HISTORY, kept for reference only.
-- ----------------------------------------------------------------------------
-- `plans.classes_per_period` — how many classes a plan includes per its
-- `duration_days` period. Optional: NULL means the plan is "ilimitado"
-- (no fixed class count), not "unknown" — box_admin's create/edit form
-- defaults new plans to unlimited via an explicit toggle, not to a made-up
-- number.
--
-- Set from box-admin's "Planes" screen (more/plans.tsx). Not yet consumed
-- anywhere else (e.g. wodplace's Home "Progreso Mensual" still uses its own
-- hardcoded goal) — that wiring is an explicit separate pending item.
--
-- Aditivo e idempotente.
-- ============================================================================

begin;

alter table public.plans
  add column if not exists classes_per_period integer;

commit;

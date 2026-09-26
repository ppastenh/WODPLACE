-- ============================================================================
-- training_settings.bodyweight_kg — Fase 3 (medallas relativas a peso corporal)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL.
-- ----------------------------------------------------------------------------
-- Self-reported, always kg regardless of preferredUnit. Null until the
-- athlete sets it in Ajustes de RM — the 9 back/front squat + deadlift ×
-- 1x/1.5x/2x BW achievements just stay locked until then, no error, same
-- convention as every other "missing data" case in evaluate.ts.
-- ============================================================================

begin;

alter table public.training_settings
  add column if not exists bodyweight_kg numeric;

commit;

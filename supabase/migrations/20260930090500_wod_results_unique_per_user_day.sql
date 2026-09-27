-- ============================================================================
-- wod_results — one result per athlete per published WOD
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL.
-- ----------------------------------------------------------------------------
-- Missed in the initial migration: an athlete should be able to edit their
-- logged result for today's WOD (fix a typo'd time, correct rounds/reps),
-- not stack duplicate rows. POST /wod-results upserts on this constraint.
-- ============================================================================

begin;

create unique index if not exists wod_results_user_wod_of_day_idx
  on public.wod_results (user_id, wod_of_day_id);

commit;

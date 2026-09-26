-- ============================================================================
-- COACHES.PERMISSIONS default — enable classes_edit  (proyecto WODPLACE / wiwpaekdykxernegicdv)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL.
-- This file is HISTORY, kept for reference only.
-- ----------------------------------------------------------------------------
-- A coach's own classes are core to their job, so classes_edit now defaults
-- to true like attendance_mark/bookings_manage/members_view/prs_manage —
-- matches the JS-side COACH_DEFAULT_PERMISSIONS constant in
-- more/coaches.tsx's AddCoach mutation, updated alongside this. Only applies
-- to the column default (belt-and-suspenders for any insert path that
-- doesn't explicitly pass `permissions`) — existing coaches' rows are
-- untouched.
--
-- Aditivo e idempotente.
-- ============================================================================

begin;

alter table public.coaches
  alter column permissions set default '{
    "classes_create": false,
    "classes_edit": true,
    "attendance_mark": true,
    "bookings_manage": true,
    "members_view": true,
    "members_edit": false,
    "prs_manage": true,
    "finances_view": false,
    "payments_register": false,
    "files_manage": false
  }'::jsonb;

commit;

-- ============================================================================
-- COACHES.PERMISSIONS default — drop unused keys, add community_post_as_box
-- (proyecto WODPLACE / wiwpaekdykxernegicdv)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL.
-- This file is HISTORY, kept for reference only.
-- ----------------------------------------------------------------------------
-- `attendance_mark` and `prs_manage` were never actually connected to
-- anything: no code path in box-admin ever checks a coach's `permissions`
-- before allowing an action (confirmed by grep — the whole permissions
-- column is read/written only inside more/coaches.tsx itself), and `prs`
-- has no write path from box-admin at all. `attendance.tsx` does have a
-- real check-in insert, but the route is orphaned — nothing links to it.
-- Dropped both from the default going forward (existing coaches' stored
-- rows are untouched; this is only the DEFAULT for new inserts).
--
-- Added `community_post_as_box`: lets a coach publish a photo to Comunidad
-- as an official box post (via the existing "Post a Comunidad" announcement
-- mechanism, which already renders as "Aviso del box" in the feed — see
-- more/notifications.tsx). Defaults to false — an admin opts a coach into
-- this individually.
--
-- Aditivo e idempotente.
-- ============================================================================

begin;

alter table public.coaches
  alter column permissions set default '{
    "classes_create": false,
    "classes_edit": true,
    "bookings_manage": true,
    "members_view": true,
    "members_edit": false,
    "finances_view": false,
    "payments_register": false,
    "files_manage": false,
    "community_post_as_box": false
  }'::jsonb;

commit;

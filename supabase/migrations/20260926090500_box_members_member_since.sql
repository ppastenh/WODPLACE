-- ============================================================================
-- box_members.member_since — editable "alumno desde" date
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL.
-- ----------------------------------------------------------------------------
-- `joined_at` is the row's own creation timestamp (when the box_members row
-- was created) — never meant to be edited, and not always accurate for a
-- member who trained at this box before the app existed. `member_since` is a
-- separate, admin-editable date used instead of joined_at for BOX-category
-- achievements (antigüedad) and the public profile's "member since" display;
-- null means "use joined_at" (the existing fallback behavior), so this is
-- additive and doesn't require backfilling every existing row.
-- ============================================================================

begin;

alter table public.box_members
  add column if not exists member_since date;

commit;

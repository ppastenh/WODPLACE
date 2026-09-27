-- STATUS: applied — do not re-run
--
-- Fix: 20260930110000_unify_skill_level_scale.sql added
--   grant update (rank) on public.wodplace_users to authenticated;
-- intending that box staff could only ever update the `rank` column via the
-- "box staff can update athlete rank" RLS policy. But Supabase's default
-- schema privileges already grant table-wide UPDATE on wodplace_users to
-- `authenticated` (confirmed live via information_schema.table_privileges),
-- so the column-level grant was redundant and box staff could in practice
-- write ANY column (name, email, birthdate, avatar_url, phrase) on any
-- athlete in a box they staff, not just rank. RLS only scopes ROWS, not
-- columns, so the broad table-level grant must be revoked first.

revoke update on public.wodplace_users from authenticated;
grant update (rank) on public.wodplace_users to authenticated;

-- STATUS: applied — do not re-run
--
-- Fase 1 of the wodplace mock-auth -> real Supabase Auth migration.
-- Foundation only — does NOT touch login/register yet (still mock).
--
-- wodplace_users.id stays exactly as-is (the client-generated mock id).
-- It's an FK in 20+ tables (RM, wod_results, user_achievements, prs,
-- social_*, contract_acceptances, training_settings, box_members, etc.) —
-- remapping it to the Supabase Auth uuid would mean touching every one of
-- those tables, a huge, error-prone migration for no real benefit. Instead:
-- a bridge column, same pattern already used for admin roles (profiles/
-- user_roles bridged to wodplace_users by email — see lib/adminRole.ts).
-- Once an athlete has a real Supabase Auth account, this column points at
-- it; every existing FK relationship is completely untouched.
--
-- Nullable and unique: null for every mock account today (the overwhelming
-- majority), unique once set (one Supabase Auth account maps to at most one
-- wodplace_users row — enforced here rather than left to the application).
alter table public.wodplace_users
  add column auth_user_id uuid references auth.users(id) on delete set null;

create unique index wodplace_users_auth_user_id_idx
  on public.wodplace_users (auth_user_id)
  where auth_user_id is not null;

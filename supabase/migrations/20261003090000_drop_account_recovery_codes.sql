-- Fase 6 (last) of the mock-auth -> real Supabase Auth migration: drops the
-- old 6-digit-email-code account-recovery system. Obsolete since login is
-- real now -- Supabase Auth has its own native password-reset/recovery
-- flow, which supersedes this entirely. No RLS policy, trigger, index, or
-- function anywhere else in the schema ever referenced this table (see
-- 20260910130000_account_recovery_codes.sql, the only migration that ever
-- touched it) -- safe to drop outright.
drop table if exists public.account_recovery_codes;

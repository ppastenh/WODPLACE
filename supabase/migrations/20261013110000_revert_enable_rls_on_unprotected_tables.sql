-- Reversa de 20261013100000_enable_rls_on_unprotected_tables.sql. Solo
-- correr a mano si algo se rompe después de aplicar esa migración.
-- STATUS: probada en rollback.

drop policy if exists "box staff read contract_read_progress" on public.contract_read_progress;
alter table public.contract_read_progress disable row level security;

drop policy if exists "super_admin read platform_agreement_acceptances" on public.platform_agreement_acceptances;
alter table public.platform_agreement_acceptances disable row level security;

alter table public.attendance disable row level security;
alter table public.blocked_users disable row level security;
alter table public.movements disable row level security;
alter table public.platform_agreement_document disable row level security;
alter table public.pr_goals disable row level security;
alter table public.training_settings disable row level security;
alter table public.wodplace_notifications disable row level security;

alter function public.storage_box_prefix(text) reset search_path;
alter function public.enforce_admin_invites_expiry() reset search_path;

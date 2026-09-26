-- ============================================================================
-- COACH_PERMISSION_CHANGES — new table + RLS  (proyecto WODPLACE / wiwpaekdykxernegicdv)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL
-- (the `postgres` role, which has BYPASSRLS). This file is HISTORY, kept for
-- reference only.
-- ----------------------------------------------------------------------------
-- Audit trail for changes to a coach's `coaches.permissions` — box-scoped,
-- visible to that box's own staff (admin + coach), unlike
-- `super_admin_audit_log` which is deliberately platform-wide and
-- super_admin-only (no box_id column, RLS reads gated to is_super_admin()).
-- Considered generalizing that table instead; rejected because it has no
-- box_id to scope by and its restricted-read design is intentional for a
-- different concern (platform actions, not a single box's own coach roster).
--
-- Written directly from box-admin's Supabase client (same style as
-- support_reports/announcements/etc.), alongside the `coaches.permissions`
-- update in more/coaches.tsx's PermissionsDialog — `changes` holds only the
-- keys that actually flipped, e.g. {"classes_edit": {"from": false, "to": true}}.
--
-- Aditivo e idempotente.
-- ============================================================================

begin;

create table if not exists public.coach_permission_changes (
  id text primary key default gen_random_uuid()::text,
  box_id text not null references public.boxes(id) on delete cascade,
  coach_id text not null references public.coaches(id) on delete cascade,
  changed_by text not null,
  changed_by_email text not null,
  changes jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_permission_changes_coach_id_idx
  on public.coach_permission_changes (coach_id, created_at desc);

alter table public.coach_permission_changes enable row level security;

-- Append-only: no update/delete policy for anyone, same guarantee as
-- super_admin_audit_log.
drop policy if exists "box staff insert coach_permission_changes" on public.coach_permission_changes;
create policy "box staff insert coach_permission_changes" on public.coach_permission_changes
  for insert to authenticated
  with check (public.user_is_box_staff(box_id));

drop policy if exists "box staff read coach_permission_changes" on public.coach_permission_changes;
create policy "box staff read coach_permission_changes" on public.coach_permission_changes
  for select to authenticated
  using (public.user_is_box_staff(box_id));

commit;

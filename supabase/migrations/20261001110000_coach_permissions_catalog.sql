-- Fase 1 of the coach permissions rollout: the permission catalog gains 3
-- new keys (manual_achievements_manage, wod_of_day_publish,
-- athlete_rank_assign) and community_post_as_box flips to on-by-default,
-- per the product decision that a new coach starts with: gestionar
-- reservas, ver miembros, publicar en comunidad a nombre del box, dar
-- medallas manuales, publicar el WOD del día, y asignar rank -- everything
-- else (crear/editar clases, editar miembros, finanzas, pagos, archivos)
-- stays off until the box_admin turns it on explicitly. classes_edit flips
-- BACK to off (a previous migration turned it on) to match this list.
--
-- IMPORTANT: this only changes the column DEFAULT (for brand-new coaches
-- created without an explicit `permissions` value) and backfills ONLY the
-- 3 new keys into existing rows (leaving every already-set key exactly as
-- it was) -- never overwrites an existing coach's saved configuration.
-- The application-side single source of truth for this catalog is
-- artifacts/box-admin/src/lib/permissions.ts -- keep the two in sync by
-- hand when either changes (Postgres can't import TypeScript).
alter table public.coaches
  alter column permissions set default '{
    "classes_create": false,
    "classes_edit": false,
    "bookings_manage": true,
    "members_view": true,
    "members_edit": false,
    "finances_view": false,
    "payments_register": false,
    "files_manage": false,
    "community_post_as_box": true,
    "manual_achievements_manage": true,
    "wod_of_day_publish": true,
    "athlete_rank_assign": true
  }'::jsonb;

update public.coaches
set permissions = jsonb_build_object(
  'manual_achievements_manage', true,
  'wod_of_day_publish', true,
  'athlete_rank_assign', true
) || permissions
where not (
  permissions ? 'manual_achievements_manage'
  and permissions ? 'wod_of_day_publish'
  and permissions ? 'athlete_rank_assign'
);

-- ── Close the coaches self-escalation hole ──────────────────────────────
-- "box staff write coaches" (for all, using = user_is_box_staff) let ANY
-- coach edit their own (or another coach's) `permissions`/`status` at will
-- via a direct Supabase call, bypassing the app's own PermissionsDialog
-- entirely -- there was no row-level restriction beyond "is box staff at
-- all". Only box_admin/super_admin may write to coaches from here on;
-- read access for all box staff (including coaches themselves, so the
-- coach roster / their own row is still visible) is unchanged.
drop policy if exists "box staff write coaches" on public.coaches;

create policy "box admin manage coaches"
on public.coaches for all
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = coaches.box_id))
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = coaches.box_id))
  )
);

-- ── The per-permission gate every Fase 3 policy will use ────────────────
-- Same shape as user_is_box_staff (box_admin/super_admin always pass),
-- plus: a coach passes only if their OWN coaches row (user_id = auth.uid())
-- has that specific permission key set to true. A coach with no linked
-- coaches row (shouldn't happen once Fase 0's redemption trigger runs, but
-- defensive regardless) never passes.
create or replace function public.user_has_box_permission(_box_id text, _permission text)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and (
        ur.role = 'super_admin'
        or (ur.role = 'box_admin' and ur.box_id = _box_id)
        or (
          ur.role = 'coach'
          and ur.box_id = _box_id
          and exists (
            select 1 from public.coaches c
            where c.user_id = auth.uid()
              and c.box_id = _box_id
              and coalesce((c.permissions ->> _permission)::boolean, false)
          )
        )
      )
  );
$$;

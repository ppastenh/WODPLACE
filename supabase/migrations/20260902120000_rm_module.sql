-- ============================================================================
-- RM / 1RM module — personal lift records, custom movements, goals, and the
-- bar-loading / training settings blob.
-- ----------------------------------------------------------------------------
-- STATUS: not yet applied. Run ONCE in the Supabase SQL Editor of the WODPLACE
-- project (wiwpaekdykxernegicdv), then add the APPLIED banner + commit.
--
-- Everything additive is idempotent (IF NOT EXISTS). `prs` is restructured:
-- box_id is dropped (RM is per-person, not per-box) and its current rows are
-- test data -> TRUNCATE, no backfill. `lift_name` stays as a stable label
-- snapshot alongside the new movement_id FK.
-- ============================================================================

begin;

-- ── movements (catalog: seeded defaults + per-user custom) ───────────────────
create table if not exists public.movements (
  id          text primary key,
  name        text not null,
  category    text,                       -- 'squat_dl' | 'press' | 'olympic' | null
  is_default  boolean not null default false,
  created_by  text references public.wodplace_users(id) on delete cascade,   -- null = seeded/global
  created_at  timestamptz not null default now()
);

-- A user can't add the same custom name twice; seeded (created_by null) names
-- are unique among themselves too.
create unique index if not exists movements_scope_name_idx
  on public.movements (coalesce(created_by, ''), lower(name));

insert into public.movements (id, name, category, is_default) values
  ('back-squat',      'Back Squat',      'squat_dl', true),
  ('front-squat',     'Front Squat',     'squat_dl', true),
  ('overhead-squat',  'Overhead Squat',  'squat_dl', true),
  ('deadlift',        'Deadlift',        'squat_dl', true),
  ('sumo-deadlift',   'Sumo Deadlift',   'squat_dl', true),
  ('strict-press',    'Strict Press',    'press',    true),
  ('push-press',      'Push Press',      'press',    true),
  ('push-jerk',       'Push Jerk',       'press',    true),
  ('bench-press',     'Bench Press',     'press',    true),
  ('snatch',          'Snatch',          'olympic',  true),
  ('power-snatch',    'Power Snatch',    'olympic',  true),
  ('squat-snatch',    'Squat Snatch',    'olympic',  true),
  ('clean',           'Clean',           'olympic',  true),
  ('power-clean',     'Power Clean',     'olympic',  true),
  ('squat-clean',     'Squat Clean',     'olympic',  true),
  ('clean-and-jerk',  'Clean & Jerk',    'olympic',  true)
on conflict (id) do nothing;

-- ── prs: restructure (current rows are test data) ──────────────────────────
truncate table public.prs;

alter table public.prs drop constraint if exists prs_box_id_fkey;
drop index  if exists public.prs_box_id_idx;
alter table public.prs drop column if exists box_id;

alter table public.prs
  add column if not exists movement_id text
    references public.movements(id) on delete restrict;
-- table is empty after the truncate, so the NOT NULL is safe
alter table public.prs alter column movement_id set not null;

alter table public.prs alter column lift_name set not null;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'prs_unit_chk'
  ) then
    alter table public.prs add constraint prs_unit_chk check (unit in ('kg','lb'));
  end if;
end $$;

alter table public.prs alter column achieved_at type date using achieved_at::date;
alter table public.prs alter column achieved_at set default current_date;

alter table public.prs add column if not exists weight_kg numeric
  generated always as (
    round((case when unit = 'lb' then weight * 0.45359237 else weight end)::numeric, 3)
  ) stored;

create index if not exists prs_user_movement_date_idx
  on public.prs (user_id, movement_id, achieved_at desc);

-- ── pr_goals (one active goal per user+movement) ───────────────────────────
create table if not exists public.pr_goals (
  id                text primary key,
  user_id           text not null references public.wodplace_users(id) on delete cascade,
  movement_id       text not null references public.movements(id) on delete cascade,
  target_weight     numeric not null,
  target_unit       text not null check (target_unit in ('kg','lb')),
  target_weight_kg  numeric generated always as (
    round((case when target_unit = 'lb' then target_weight * 0.45359237 else target_weight end)::numeric, 3)
  ) stored,
  created_at        timestamptz not null default now(),
  achieved_at       date
);
create unique index if not exists pr_goals_user_movement_idx
  on public.pr_goals (user_id, movement_id);

-- ── training_settings (bar-loader config + preferred unit) ─────────────────
create table if not exists public.training_settings (
  user_id         text primary key references public.wodplace_users(id) on delete cascade,
  preferred_unit  text not null default 'kg' check (preferred_unit in ('kg','lb')),
  sex             text check (sex in ('f','m','x')),
  bar_weight      numeric not null default 20,
  bar_unit        text not null default 'kg' check (bar_unit in ('kg','lb')),
  plates          jsonb not null default '[
    {"unit":"kg","weight":25,"pairs":4},
    {"unit":"kg","weight":20,"pairs":4},
    {"unit":"kg","weight":15,"pairs":2},
    {"unit":"kg","weight":10,"pairs":2},
    {"unit":"kg","weight":5,"pairs":2},
    {"unit":"kg","weight":2.5,"pairs":2},
    {"unit":"kg","weight":1,"pairs":2},
    {"unit":"kg","weight":0.5,"pairs":2}
  ]'::jsonb,
  updated_at      timestamptz not null default now()
);

-- Idempotent: if the table already existed (migration re-run after the first
-- apply), make sure the default plate set matches the current catalog
-- (fractional 0.5..2.5, no 1.25). Existing rows keep their configured set;
-- users pick "Volver al set por defecto" in the app to adopt this.
alter table public.training_settings alter column plates set default '[
  {"unit":"kg","weight":25,"pairs":4},
  {"unit":"kg","weight":20,"pairs":4},
  {"unit":"kg","weight":15,"pairs":2},
  {"unit":"kg","weight":10,"pairs":2},
  {"unit":"kg","weight":5,"pairs":2},
  {"unit":"kg","weight":2.5,"pairs":2},
  {"unit":"kg","weight":1,"pairs":2},
  {"unit":"kg","weight":0.5,"pairs":2}
]'::jsonb;

commit;

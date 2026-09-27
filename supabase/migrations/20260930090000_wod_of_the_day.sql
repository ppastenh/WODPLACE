-- ============================================================================
-- WOD del día — catálogo, publicación diaria, y resultados de alumnos
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL
-- (the `postgres` role, which has BYPASSRLS).
-- ----------------------------------------------------------------------------
-- Three tables:
--   - wods: catalog (seeded hero WODs, box_id null, + a box's own custom
--     ones, box_id set) — same created-by scoping shape as `movements`.
--   - wod_of_day: one published WOD per box per day. box-admin writes this
--     directly via Supabase (RLS below) — same pattern as announcements/
--     class_sessions.
--   - wod_results: an athlete's logged result for a specific day's
--     publication. Only api-server's BYPASSRLS connection touches this
--     (wodplace never talks to Supabase directly) — no RLS policies needed,
--     enabled with none = default-deny for anon/authenticated, same fix as
--     class_bookings/user_achievements.
-- ============================================================================

begin;

create table if not exists public.wods (
  id                text primary key,
  name              text not null,
  format            text not null, -- 'for_time' | 'amrap' | 'max_reps'
  time_cap_minutes  integer,
  description       text not null,
  box_id            text references public.boxes(id) on delete cascade, -- null = global hero WOD
  created_at        timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wods_format_check') then
    alter table public.wods
      add constraint wods_format_check check (format in ('for_time', 'amrap', 'max_reps'));
  end if;
end $$;

create table if not exists public.wod_of_day (
  id            text primary key default gen_random_uuid()::text,
  box_id        text not null references public.boxes(id) on delete cascade,
  wod_id        text not null references public.wods(id) on delete restrict,
  session_date  date not null,
  notes         text,
  created_by    text,
  created_at    timestamptz not null default now()
);

create unique index if not exists wod_of_day_box_date_idx
  on public.wod_of_day (box_id, session_date);

create table if not exists public.wod_results (
  id              text primary key,
  user_id         text not null references public.wodplace_users(id) on delete cascade,
  wod_of_day_id   text not null references public.wod_of_day(id) on delete cascade,
  time_seconds    integer,
  rounds          integer,
  reps            integer,
  scaled          boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists wod_results_user_idx on public.wod_results (user_id);
create index if not exists wod_results_wod_of_day_idx on public.wod_results (wod_of_day_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.wods enable row level security;

drop policy if exists "box staff read wods" on public.wods;
create policy "box staff read wods" on public.wods
  for select to authenticated
  using (box_id is null or public.user_is_box_staff(box_id));

drop policy if exists "box staff write own wods" on public.wods;
create policy "box staff write own wods" on public.wods
  for all to authenticated
  using (box_id is not null and public.user_is_box_staff(box_id))
  with check (box_id is not null and public.user_is_box_staff(box_id));

alter table public.wod_of_day enable row level security;

drop policy if exists "box staff manage wod_of_day" on public.wod_of_day;
create policy "box staff manage wod_of_day" on public.wod_of_day
  for all to authenticated
  using (public.user_is_box_staff(box_id))
  with check (public.user_is_box_staff(box_id));

alter table public.wod_results enable row level security;

-- ── Seed: hero/benchmark catalog ─────────────────────────────────────────────

insert into public.wods (id, name, format, time_cap_minutes, description) values
  ('fran', 'Fran', 'for_time', null, '21-15-9 reps for time: Thrusters (95/65 lb), Pull-ups'),
  ('grace', 'Grace', 'for_time', null, '30 reps for time: Clean & Jerks (135/95 lb)'),
  ('helen', 'Helen', 'for_time', null, '3 rounds for time: 400m Run, 21 Kettlebell Swings (53/35 lb), 12 Pull-ups'),
  ('isabel', 'Isabel', 'for_time', null, '30 reps for time: Snatches (135/95 lb)'),
  ('diane', 'Diane', 'for_time', null, '21-15-9 reps for time: Deadlifts (225/155 lb), Handstand Push-ups'),
  ('annie', 'Annie', 'for_time', null, '50-40-30-20-10 reps for time: Double-unders, Sit-ups'),
  ('nancy', 'Nancy', 'for_time', null, '5 rounds for time: 400m Run, 15 Overhead Squats (95/65 lb)'),
  ('karen', 'Karen', 'for_time', null, '150 reps for time: Wall-ball shots (20/14 lb)'),
  ('fight-gone-bad', 'Fight Gone Bad', 'max_reps', 17, '3 rounds, 1 min por estación (1 min de descanso entre rondas): Wall-ball, Sumo deadlift high-pull, Box jump, Push press, Row (calorías). Puntaje = reps totales de las 3 rondas.'),
  ('murph', 'Murph', 'for_time', null, 'For time: 1 milla Run, 100 Pull-ups, 200 Push-ups, 300 Squats, 1 milla Run (particioná las reps como necesites; con chaleco de 20/14 lb si podés)'),
  ('chad', 'Chad', 'for_time', null, '1000 Step-ups for time, con un disco de 45/25 lb sobre la cabeza, alternando piernas, sobre un cajón de 20 pulgadas'),
  ('dt', 'DT', 'for_time', null, '5 rounds for time: 12 Deadlifts, 9 Hang Power Cleans, 6 Push Jerks (155/105 lb)'),
  ('cindy', 'Cindy', 'amrap', 20, 'AMRAP en 20 minutos: 5 Pull-ups, 10 Push-ups, 15 Air Squats'),
  ('angie', 'Angie', 'for_time', null, '100 reps de cada uno for time: Pull-ups, Push-ups, Sit-ups, Squats'),
  ('barbara', 'Barbara', 'for_time', null, '5 rounds for time (3 min de descanso entre rondas): 20 Pull-ups, 30 Push-ups, 40 Sit-ups, 50 Squats'),
  ('chelsea', 'Chelsea', 'amrap', 30, 'EMOM durante 30 minutos: 5 Pull-ups, 10 Push-ups, 15 Air Squats. Registrá los rounds completos que pudiste sostener en ritmo.'),
  ('elizabeth', 'Elizabeth', 'for_time', null, '21-15-9 reps for time: Cleans (135/95 lb), Ring Dips'),
  ('linda', 'Linda', 'for_time', null, '10-9-8-7-6-5-4-3-2-1 reps for time: Deadlift (1.5x peso corporal), Bench Press (peso corporal), Clean (0.75x peso corporal)'),
  ('kalsu', 'Kalsu', 'for_time', null, '100 Thrusters (135/95 lb) for time; 5 Burpees al comienzo de cada minuto (EMOM)')
on conflict (id) do nothing;

commit;

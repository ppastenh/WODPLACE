-- ============================================================================
-- wod_results.scaled (boolean Rx/Scaled) -> wod_results.level (6-level scale)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL.
-- ----------------------------------------------------------------------------
-- New scale, low to high: beginner, rookie, scaled, master, rx, elite.
-- Existing rows (Rx/Scaled boolean) map losslessly: scaled=true -> 'scaled',
-- scaled=false -> 'rx' — both names already exist verbatim in the new scale.
-- ============================================================================

begin;

alter table public.wod_results
  add column if not exists level text;

update public.wod_results
set level = case when scaled then 'scaled' else 'rx' end
where level is null;

alter table public.wod_results
  alter column level set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wod_results_level_check') then
    alter table public.wod_results
      add constraint wod_results_level_check
      check (level in ('beginner', 'rookie', 'scaled', 'master', 'rx', 'elite'));
  end if;
end $$;

alter table public.wod_results
  drop column if exists scaled;

commit;

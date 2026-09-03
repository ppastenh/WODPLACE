-- RM module: record the self-reported % of true 1RM a lift was performed at.
--
-- `prs.weight` stores the projected 100% value (input / (percentage / 100)),
-- so this column is context only. Nullable — existing rows predate the field
-- and are treated as 100%.

alter table public.prs
  add column if not exists percentage numeric;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'prs_percentage_chk'
  ) then
    alter table public.prs
      add constraint prs_percentage_chk
      check (percentage is null or (percentage >= 30 and percentage <= 110));
  end if;
end $$;

-- STATUS: applied — do not re-run
--
-- Lets box-admin revoke a specific WOD-category automatic medal when the
-- admin deletes the wod_result that caused it (e.g. the athlete lied about
-- doing the WOD). `on delete set null`, not cascade: the medal row must
-- never disappear silently just because the source row is gone for some
-- other reason — only the explicit "delete this result" action in
-- box-admin deletes both together (it does the achievement delete itself,
-- as a separate statement, so it can show the admin which medals will go
-- first). Only evaluate.ts's evaluateWod() ever sets this (count/level/
-- hero/improve — never wod_beast_mode, which comes from 5 results
-- together, not one); every other achievement keeps it null and stays
-- permanent as before.
alter table public.user_achievements
  add column source_wod_result_id text references public.wod_results(id) on delete set null;

create index user_achievements_source_wod_result_idx
  on public.user_achievements (source_wod_result_id)
  where source_wod_result_id is not null;

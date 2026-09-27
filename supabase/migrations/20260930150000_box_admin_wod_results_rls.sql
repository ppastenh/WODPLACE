-- STATUS: applied — do not re-run
--
-- box-admin's minimal WOD results view (member-detail.$id.tsx): the admin
-- can see an athlete's logged WOD results and delete a specific bad one
-- (e.g. the athlete lied about doing the WOD). Two gaps this closes:
--
-- 1. wod_results got RLS enabled with ZERO policies in the WOD del día
--    migration (only api-server's BYPASSRLS connection could touch it —
--    same "Fase 1" pattern user_achievements had before MOVIMIENTO).
--    Box staff need SELECT (to show the history) and DELETE (to remove a
--    bad result) for athletes in a box they staff, scoped via the same
--    wod_of_day.box_id join api-server itself uses.
--
-- 2. Deleting a bad result must also let box-admin remove the specific
--    automatic medals it caused (user_achievements.source_wod_result_id,
--    see 20260930140000). The existing "box staff manage manual
--    achievements" policy only covers rows with box_id is not null
--    (MOVIMIENTO/COMPETENCIA) — these WOD-triggered rows are automatic, so
--    box_id is always null on them. A separate, narrowly-scoped policy:
--    only rows that DO carry a source_wod_result_id, and only when that
--    result belongs to an athlete in a box the caller staffs. Every other
--    automatic achievement (source_wod_result_id null) stays untouchable,
--    exactly as before — no broadening beyond this specific need.

drop policy if exists "box staff read wod_results" on public.wod_results;
create policy "box staff read wod_results" on public.wod_results
  for select to authenticated
  using (
    exists (
      select 1 from public.wod_of_day wod
      where wod.id = wod_results.wod_of_day_id
        and public.user_is_box_staff(wod.box_id)
    )
  );

drop policy if exists "box staff delete wod_results" on public.wod_results;
create policy "box staff delete wod_results" on public.wod_results
  for delete to authenticated
  using (
    exists (
      select 1 from public.wod_of_day wod
      where wod.id = wod_results.wod_of_day_id
        and public.user_is_box_staff(wod.box_id)
    )
  );

drop policy if exists "box staff read wod-triggered medals" on public.user_achievements;
create policy "box staff read wod-triggered medals" on public.user_achievements
  for select to authenticated
  using (
    source_wod_result_id is not null
    and exists (
      select 1 from public.wod_results wr
      join public.wod_of_day wod on wod.id = wr.wod_of_day_id
      where wr.id = user_achievements.source_wod_result_id
        and public.user_is_box_staff(wod.box_id)
    )
  );

drop policy if exists "box staff revoke wod-triggered medals" on public.user_achievements;
create policy "box staff revoke wod-triggered medals" on public.user_achievements
  for delete to authenticated
  using (
    source_wod_result_id is not null
    and exists (
      select 1 from public.wod_results wr
      join public.wod_of_day wod on wod.id = wr.wod_of_day_id
      where wr.id = user_achievements.source_wod_result_id
        and public.user_is_box_staff(wod.box_id)
    )
  );

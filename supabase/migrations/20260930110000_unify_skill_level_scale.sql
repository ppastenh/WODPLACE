-- ============================================================================
-- Unify wodplace_users.rank with the WOD result level scale
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL.
-- ----------------------------------------------------------------------------
-- rank used to be a free-text field with values 'Beginner'/'Rookie'/'Scaled'/
-- 'Rx'/'Elite'/'Coach' (capitalized), set only once at account activation
-- (always 'Beginner') — nothing ever wrote a different value: the athlete-
-- facing RankSheet component existed but was never wired into any real
-- screen, and box-admin only ever read rank, never wrote it. Live data
-- confirmed this: every non-null row was exactly 'Beginner'.
--
-- Now unified with the WOD result level scale (lowercase ids: beginner,
-- rookie, scaled, master, rx, elite) so an athlete's assigned level can
-- double as their default WOD result level with no mapping table. 'Coach'
-- dropped (never actually used — box-admin's real coach/admin role already
-- lives in user_roles, unrelated to this field) in favor of adding 'master'
-- to match the WOD scale exactly.
--
-- Assignment moves from "nothing" to box-admin: a coach sets an athlete's
-- level from the member's profile — new grant + RLS policy below, scoped to
-- the `rank` column only (not the rest of wodplace_users) and to athletes in
-- a box the caller staffs.
-- ============================================================================

begin;

update public.wodplace_users
set rank = 'beginner'
where rank = 'Beginner';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wodplace_users_rank_check') then
    alter table public.wodplace_users
      add constraint wodplace_users_rank_check
      check (rank is null or rank in ('beginner', 'rookie', 'scaled', 'master', 'rx', 'elite'));
  end if;
end $$;

grant update (rank) on public.wodplace_users to authenticated;

drop policy if exists "box staff can update athlete rank" on public.wodplace_users;
create policy "box staff can update athlete rank" on public.wodplace_users
  for update to authenticated
  using (
    exists (
      select 1 from public.box_members bm
      where bm.user_id = wodplace_users.id and public.user_is_box_staff(bm.box_id)
    )
  )
  with check (
    exists (
      select 1 from public.box_members bm
      where bm.user_id = wodplace_users.id and public.user_is_box_staff(bm.box_id)
    )
  );

commit;

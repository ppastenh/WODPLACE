-- ============================================================================
-- MOVIMIENTO achievements — Fase 2 (medallas otorgadas a mano por el coach)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL.
-- ----------------------------------------------------------------------------
-- Two additive changes:
--
-- 1. "Split Jerk" was missing from the movements catalog (only "Push Jerk"
--    existed) — part of the original data survey for the MOVIMIENTO
--    category, called out explicitly before building Fase 2.
--
-- 2. user_achievements got RLS enabled with ZERO policies in Fase 1 (locked
--    to anon/authenticated — only api-server's BYPASSRLS connection could
--    touch it, for the 5 automatic categories). MOVIMIENTO is the first kind
--    box-admin writes to DIRECTLY via Supabase (coach ticks a checkbox in
--    member-detail.$id.tsx), so it needs a real policy now. Scoped to rows
--    that carry a box_id (only ever true for manually-granted achievements —
--    the automatic ones evaluate.ts writes always have box_id null), so this
--    can never expose or let staff tamper with another user's automatic
--    unlocks. Same user_is_box_staff(box_id) shape as every other box-scoped
--    table.
-- ============================================================================

begin;

insert into public.movements (id, name, category, is_default) values
  ('split-jerk', 'Split Jerk', 'olympic', true)
on conflict (id) do nothing;

drop policy if exists "box staff manage manual achievements" on public.user_achievements;
create policy "box staff manage manual achievements" on public.user_achievements
  for all to authenticated
  using (box_id is not null and public.user_is_box_staff(box_id))
  with check (box_id is not null and public.user_is_box_staff(box_id));

commit;

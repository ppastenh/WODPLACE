-- ============================================================================
-- Reversa de 20261025140000_contract_acceptances_lectura_solo_admin.sql
-- Quita la función de la lista y devuelve la política de lectura a user_is_box_staff(box_id) (staff del box,
-- coaches incluidos), tal como estaba. Probada en una transacción con ROLLBACK (política idéntica a la original,
-- la función desaparece). Solo correr a mano si algo se rompe después de aplicar esa migración.
-- ============================================================================

begin;

drop function if exists public.box_contract_acceptances_list(text);

drop policy if exists "box admin read contract_acceptances" on public.contract_acceptances;
create policy "box admin read contract_acceptances" on public.contract_acceptances
  for select to authenticated
  using (public.user_is_box_staff(box_id));

commit;

-- Reversa de 20261014100000_coach_finance_lockdown.sql. Solo correr a mano
-- si algo se rompe después de aplicar esa migración. STATUS: probada en
-- rollback.

drop trigger if exists payments_box_consistency on public.payments;
drop function if exists public.enforce_payment_box_consistency();

alter table public.payments drop constraint if exists payments_amount_range;

drop policy if exists "box admin write plans" on public.plans;
create policy "box staff write plans" on public.plans
  for all
  using (public.user_is_box_staff(box_id))
  with check (public.user_is_box_staff(box_id));

drop policy if exists "box admin read payments" on public.payments;
drop policy if exists "box admin write payments" on public.payments;

create policy "box staff read payments" on public.payments
  for select
  using (public.user_is_box_staff(box_id));

create policy "box staff write payments" on public.payments
  for all
  using (public.user_is_box_staff(box_id))
  with check (public.user_is_box_staff(box_id));

drop function if exists public.user_is_box_admin_or_super_admin(text);

-- Nota: esta reversa NO reinstala finances_view/payments_register en
-- permissions.ts (ese es un cambio de código, no de esta migración) ni
-- vuelve a escribirlos en coaches.permissions (ninguna fila los tenía en
-- true antes de quitarlos, no hay nada que restaurar ahí).

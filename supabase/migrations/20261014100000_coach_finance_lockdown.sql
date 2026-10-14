-- S3.A de la auditoría de seguridad (2026-10-14). STATUS: applied 2026-10-14.
--
-- Decisión de producto de Pía: las finanzas del box son SOLO de
-- administrador/dueño/super admin. Ningún coach las toca, ni siquiera con un
-- permiso activado — por eso esto no agrega un permiso nuevo, quita los dos
-- que existían (finances_view/payments_register) del catálogo de coach.
--
-- Evidencia antes de aplicar: 0 de los 2 coaches reales existentes tenía
-- cualquiera de los dos en true. `payments` y la escritura de `plans` solo
-- exigían `user_is_box_staff` (cualquier coach), sin mirar esos permisos en
-- absoluto -- hueco real, no solo un permiso mal puesto.

-- Helper nuevo: admin de ESTE box (dueño o no) o super admin. A diferencia de
-- user_is_box_owner_or_super_admin (solo el dueño), y de user_is_box_staff
-- (incluye coach), este es exactamente "administrador o más arriba".
create or replace function public.user_is_box_admin_or_super_admin(_box_id text)
returns boolean
language sql stable security definer set search_path = 'public'
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = _box_id))
  );
$$;

-- payments: antes "ALL"/"SELECT" con user_is_box_staff (cualquier coach).
-- Ahora solo administrador/dueño/super admin, lectura y escritura.
drop policy if exists "box staff write payments" on public.payments;
drop policy if exists "box staff read payments" on public.payments;

create policy "box admin read payments" on public.payments
  for select
  using (public.user_is_box_admin_or_super_admin(box_id));

create policy "box admin write payments" on public.payments
  for all
  using (public.user_is_box_admin_or_super_admin(box_id))
  with check (public.user_is_box_admin_or_super_admin(box_id));

-- plans: la LECTURA se deja igual (user_is_box_staff) -- un coach sigue
-- necesitando ver el NOMBRE de los planes para asignarlos a un miembro
-- nuevo (AddMemberFab), eso no es información financiera. Lo que se cierra
-- es la ESCRITURA (crear/editar precios) -- eso sí es exclusivo de admin.
drop policy if exists "box staff write plans" on public.plans;

create policy "box admin write plans" on public.plans
  for all
  using (public.user_is_box_admin_or_super_admin(box_id))
  with check (public.user_is_box_admin_or_super_admin(box_id));

-- Validación mínima en payments (en vez de una función RPC atómica -- el
-- flujo de un administrador ya funciona entero hoy, insert + update en dos
-- pasos, con el botón deshabilitado mientras la mutación está en curso; no
-- hay evidencia de un riesgo real de doble registro). Lo que SÍ faltaba:
-- nada validaba que el monto fuera positivo/razonable, ni que el plan o el
-- miembro de un pago pertenecieran de verdad a ese box.
alter table public.payments
  add constraint payments_amount_range check (amount > 0 and amount <= 5000000);

create or replace function public.enforce_payment_box_consistency()
returns trigger
language plpgsql security definer set search_path = 'public'
as $$
begin
  if new.plan_id is not null and not exists (
    select 1 from public.plans p where p.id = new.plan_id and p.box_id = new.box_id
  ) then
    raise exception 'El plan no pertenece a este box' using errcode = 'check_violation';
  end if;

  if not exists (
    select 1 from public.box_members bm where bm.box_id = new.box_id and bm.user_id = new.user_id
  ) then
    raise exception 'El miembro no pertenece a este box' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists payments_box_consistency on public.payments;
create trigger payments_box_consistency
  before insert or update on public.payments
  for each row execute function public.enforce_payment_box_consistency();

-- Quita finances_view/payments_register de cualquier fila de coaches que
-- los tuviera guardados (confirmado: ninguno en true, pero se limpia la
-- clave de todas formas, nunca más debe existir en el catálogo).
update public.coaches
set permissions = permissions - 'finances_view' - 'payments_register'
where permissions ?| array['finances_view', 'payments_register'];

-- Admin notification bell, "Nuevos miembros": tracks which members were
-- individually marked as seen, per member — not a single all-or-nothing
-- cursor. Same shape as contract_acceptances.seen_by_owner_at, just here
-- because a "new member" alert item IS a box_members row.
--
-- Aditivo e idempotente — seguro de correr aunque la columna ya exista.
-- No requiere RLS nueva: box_members ya tiene policy de UPDATE para
-- admin/staff (usada hoy por el toggle de estado en el perfil del miembro),
-- y RLS es por fila, no por columna.

alter table public.box_members
  add column if not exists new_member_seen_at timestamptz;

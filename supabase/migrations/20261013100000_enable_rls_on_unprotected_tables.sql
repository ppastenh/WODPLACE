-- S1.1 de la auditoría de seguridad (2026-10-13). STATUS: applied 2026-10-13.
--
-- Activa RLS en las 9 tablas que no la tenían. Inventario de quién las usa
-- hoy (evidencia en la conversación):
--   - attendance: NADIE. Código muerto (comentarios hablan de un plan
--     "Fase C" nunca construido; el seguimiento real de asistencia vive en
--     columnas de class_bookings desde la migración
--     20261001170000_class_bookings_attendance.sql). Deny-all.
--   - blocked_users: solo api-server (service role, routes/social.ts,
--     bloquear/desbloquear usuarios). Ningun cliente directo. Deny-all.
--   - movements: solo api-server (routes/rm.ts). wodplace llama a la API
--     (GET /movements), nunca a la tabla directo. Deny-all.
--   - platform_agreement_document: solo api-server
--     (routes/platformAgreement.ts, lib/contractDocuments.ts). Deny-all --
--     tal como pidió Pía, ningun cliente escribe ni lee esto directo.
--   - pr_goals: solo api-server (routes/rm.ts). Deny-all.
--   - training_settings: solo api-server (routes/rm.ts,
--     lib/achievements/evaluate.ts). Deny-all.
--   - wodplace_notifications: solo api-server (routes/bookings.ts,
--     notifications.ts, social.ts). Deny-all.
--   - contract_read_progress: api-server (routes/contracts.ts) Y box-admin
--     lee directo (more/files.tsx, el contador "X/Y aceptaron" por
--     documento) -- necesita policy de lectura para staff del box.
--   - platform_agreement_acceptances: api-server
--     (routes/platformAgreement.ts) Y super-admin lee directo
--     (agreements.tsx, quien aceptó el Acuerdo) -- necesita policy de
--     lectura para super_admin.
--
-- "RLS activado sin políticas" deniega TODO a cualquier rol que no sea el
-- service role (que siempre bypasea RLS) -- api-server sigue funcionando
-- exactamente igual; solo se cierra el acceso directo desde anon/
-- authenticated que no tenía ningún control hasta ahora.

alter table public.attendance enable row level security;
alter table public.blocked_users enable row level security;
alter table public.movements enable row level security;
alter table public.platform_agreement_document enable row level security;
alter table public.pr_goals enable row level security;
alter table public.training_settings enable row level security;
alter table public.wodplace_notifications enable row level security;

alter table public.contract_read_progress enable row level security;
create policy "box staff read contract_read_progress"
  on public.contract_read_progress for select
  using (user_is_box_staff(box_id));

alter table public.platform_agreement_acceptances enable row level security;
create policy "super_admin read platform_agreement_acceptances"
  on public.platform_agreement_acceptances for select
  using (is_super_admin());

-- B0 de la Fase B (dueño/traspaso). Verificado antes de aplicar: los 5
-- boxes existentes ya tienen owner_user_id poblado, apuntando a una cuenta
-- real que ademas tiene el rol box_admin de ese mismo box -- no hace falta
-- backfill de datos, solo el constraint. STATUS: applied 2026-10-11.
alter table public.boxes
  alter column owner_user_id set not null;

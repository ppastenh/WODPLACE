-- ============================================================================
-- BOXES — photo_url + Storage policy for box logos  (proyecto WODPLACE / wiwpaekdykxernegicdv)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL
-- (the `postgres` role). This file is HISTORY, kept for reference only.
-- ----------------------------------------------------------------------------
-- `boxes.photo_url` — the box's "logo" (really just its profile photo, same
-- concept as an athlete's avatar, not a separate asset type). Set from
-- box-admin's own "Configuración" page, shown to athletes in wodplace
-- (Inicio, Datos Personales, Box Detail — see GET /box-memberships/my-box).
--
-- Storage: same public "wodplace-uploads" bucket as everything else
-- (avatars, Comunidad/Soporte screenshots), new "box-logos/" prefix.
-- Box-admin has real Supabase Auth and already uploads directly to this
-- bucket for other things (see the "support/" prefix policy from the
-- Soporte feature) — same pattern here, any box_admin/super_admin may
-- write under this prefix.
--
-- Aditivo e idempotente.
-- ============================================================================

begin;

alter table public.boxes
  add column if not exists photo_url text;

drop policy if exists "admin write box logo upload" on storage.objects;
create policy "admin write box logo upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wodplace-uploads'
    and (storage.foldername(name))[1] = 'box-logos'
    and public.user_is_any_box_admin()
  );

commit;

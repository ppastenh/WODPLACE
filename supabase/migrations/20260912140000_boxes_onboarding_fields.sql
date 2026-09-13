-- ============================================================================
-- BOXES — nuevas columnas para el onboarding de un box_admin  (proyecto WODPLACE / wiwpaekdykxernegicdv)
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL
-- (the `postgres` role). This file is HISTORY, kept for reference only.
-- ----------------------------------------------------------------------------
-- `boxes` is Supabase-managed (not part of @workspace/db's Drizzle schema —
-- it predates the migrations in this repo), so its DDL lives here instead of
-- in lib/db/src/schema. Adds the fields the new "Crear mi Box" +
-- "Datos del Box" flow collects, on top of the 7 columns that already
-- existed (id, name, location, owner_user_id, status, created_at,
-- updated_at):
--   - owner_name: free-text display name of the person in charge
--     ("Encargado") — distinct from owner_user_id, which is a FK to the
--     real Supabase Auth account, not a human-readable name.
--   - contact_phone: cell/WhatsApp contact number.
--   - whatsapp / instagram_url / facebook_url / tiktok_url: optional social
--     links — same field names wodplace's box-detail.tsx mock
--     (constants/boxInfo.ts) already expects, so wiring it to real data
--     later is a straight swap.
-- All nullable: only "Nombre del Box" and "Ubicación" are asked at
-- box-creation time in this flow; the rest can be filled in later.
--
-- Aditivo e idempotente.
-- ============================================================================

begin;

alter table public.boxes
  add column if not exists owner_name text,
  add column if not exists contact_phone text,
  add column if not exists whatsapp text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists tiktok_url text;

commit;

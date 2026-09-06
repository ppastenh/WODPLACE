-- Athlete-uploaded profile photo, canonical across the app: the mobile
-- profile screen writes it, the new public member profile (community) and
-- box-admin's member views read it. Aditivo e idempotente.
alter table public.wodplace_users
  add column if not exists avatar_url text;

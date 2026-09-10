-- Account recovery for wodplace athletes (no real auth — the local id is
-- lost on a new device / cleared app data). One-time 6-digit code emailed
-- to the address on file; verifying it returns the existing
-- wodplace_users.id so the phone can re-adopt it. Code is stored hashed
-- (scrypt, via lib/pinHash), single active row per user, short expiry,
-- locked after repeated failures — same shape as admin_pins.
create table if not exists public.account_recovery_codes (
  user_id      text primary key references public.wodplace_users(id) on delete cascade,
  code_hash    text not null,
  expires_at   timestamptz not null,
  attempts     integer not null default 0,
  locked_until timestamptz,
  created_at   timestamptz not null default now()
);

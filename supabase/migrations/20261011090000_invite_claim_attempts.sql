-- Tracks FAILED attempts to redeem a staff invite (by code), for rate
-- limiting the new POST /invites/claim endpoint (api-server) by session
-- user and by IP. Successful claims are already recorded on
-- admin_invites itself (used_at/used_by) — this table is only for
-- throttling brute-force guessing of codes, nothing else.
--
-- Written/read only by api-server's own privileged DB connection
-- (role postgres, bypasses RLS entirely — see lib/db's connection, same
-- as every other raw-SQL table api-server touches). RLS is enabled with
-- zero policies anyway, per this project's own rule that every new
-- table gets RLS from day one, even when the only real caller bypasses
-- it — closes the table off from PostgREST/anon/authenticated access by
-- default if that connection model ever changes.
-- Deliberately has NO column for the code that was tried — only that an
-- attempt happened, by whom/from where, and when.
create table public.invite_claim_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, -- the session's auth.uid() at attempt time, if any
  ip text,
  created_at timestamptz not null default now()
);

create index invite_claim_attempts_user_id_idx on public.invite_claim_attempts (user_id);
create index invite_claim_attempts_ip_idx on public.invite_claim_attempts (ip);
create index invite_claim_attempts_created_at_idx on public.invite_claim_attempts (created_at);

alter table public.invite_claim_attempts enable row level security;
revoke all on public.invite_claim_attempts from public, anon, authenticated;
grant all on public.invite_claim_attempts to service_role;

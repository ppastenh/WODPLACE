-- Urgent fix: `prs` had row level security disabled entirely, meaning any
-- authenticated Supabase user (any athlete or coach's own JWT, via a direct
-- PostgREST call, not just through wodplace's app/api-server) could read or
-- write ANY row in this table, for any athlete, in any box. `prs` has no
-- box_id column of its own (a PR belongs to the athlete across boxes), so
-- staff access is scoped by joining through box_members to find which
-- box(es) the target athlete belongs to.
--
-- Read-only for staff, matching how box-admin's member-detail PRs tab
-- actually uses this table (no write path from box-admin exists) --
-- writes stay exclusively through api-server's own POST/PATCH/DELETE
-- /prs endpoints, which connect as the `postgres` role (rolbypassrls) and
-- are unaffected by RLS either way -- see the Fase 4 assertOwnsAccount
-- enforcement there for the real write-side authorization.
alter table public.prs enable row level security;

create policy "box staff read member prs"
on public.prs
for select
using (
  exists (
    select 1
    from public.box_members bm
    where bm.user_id = prs.user_id
      and public.user_is_box_staff(bm.box_id)
  )
);

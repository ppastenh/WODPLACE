-- Fase 0 of the coach/admin role rollout: admin_invites existed (email,
-- code, expiry, single-use fields) but NOTHING ever consumed it -- a
-- redeemed invite_code in a signup's metadata was silently ignored, no
-- user_roles row or coaches.user_id link was ever created. Confirmed live:
-- 0 of the 2 existing coaches rows have user_id set, and user_roles has
-- zero 'coach' rows despite the invite/permissions UI existing for over a
-- month. Separately, admin_invites had RLS fully disabled (0 policies) --
-- any authenticated user (any athlete) could insert their own invite row
-- for any box_id/role and redeem it themselves.

-- ── admin_invites: lock it down ─────────────────────────────────────────
-- Email is now mandatory (was optional -- "" meant "anyone with the code
-- can redeem it", exactly the kind of unscoped invite the redemption
-- trigger below refuses to honor anyway, since it always requires an
-- exact email match). The empty-string path is now enforced dead at the
-- DB level too, not just removed from the UI.
alter table public.admin_invites
  add constraint admin_invites_email_not_blank check (btrim(email) <> '');

alter table public.admin_invites enable row level security;

-- Any box_admin/super_admin/coach for a box can see and manage that box's
-- own invites -- same "box staff" gate as every other box-scoped table.
-- Deliberately no coach write access needed/wanted here: inviting new
-- staff isn't one of the 8 planned coach permissions, and coaches never
-- call this UI (only box-admin's "Invitar Staff" screen does).
create policy "box staff read own box invites"
on public.admin_invites for select
using (public.user_is_box_staff(box_id));

create policy "box staff create invites for own box"
on public.admin_invites for insert
with check (
  created_by = auth.uid()
  and public.user_is_box_staff(box_id)
);

create policy "box staff delete own box invites"
on public.admin_invites for delete
using (public.user_is_box_staff(box_id));

-- No UPDATE policy for clients on purpose -- only the SECURITY DEFINER
-- trigger below marks an invite used, same pattern as
-- guard_user_roles_writes already uses for user_roles.

-- ── Redemption: a trigger on auth.users, not a client-invoked RPC ───────
-- Runs in the SAME transaction as the signup itself, using the email
-- Supabase Auth already verified for that signup -- not something a
-- client could separately spoof after the fact. Never fires again for an
-- existing account (AFTER INSERT only, not UPDATE), so there is no path
-- for an already-authenticated user to redeem a second invite into a
-- higher role by mutating their own metadata later.
create or replace function public.redeem_admin_invite()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_invite record;
begin
  if new.raw_user_meta_data ? 'invite_code' then
    select * into v_invite
    from public.admin_invites
    where code = new.raw_user_meta_data->>'invite_code'
      and used_at is null
      and (expires_at is null or expires_at > now())
      and lower(email) = lower(new.email)
    for update;

    if v_invite.id is not null then
      update public.admin_invites
      set used_at = now(), used_by = new.id, status = 'aceptado'
      where id = v_invite.id;

      -- The role always comes from the invite row itself -- the signing-up
      -- client only ever supplies the opaque invite_code, never a role.
      insert into public.user_roles (user_id, role, box_id)
      values (new.id, v_invite.role, v_invite.box_id)
      on conflict (user_id, role, box_id) do nothing;

      if v_invite.role = 'coach' then
        update public.coaches
        set user_id = new.id
        where box_id = v_invite.box_id
          and lower(email) = lower(new.email)
          and user_id is null;

        if not found then
          -- No pre-existing coach profile for this email (an admin can
          -- invite before or after creating one in the Coaches screen) --
          -- auto-create it with the table's own default permissions
          -- (already the deliberately narrow Fase-1 default set).
          insert into public.coaches (box_id, name, email, user_id)
          values (v_invite.box_id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email, new.id);
        end if;
      end if;
    end if;
    -- Invalid/expired/already-used code, or an email that doesn't match --
    -- fails silently toward NO privilege: the account is still created,
    -- just as a plain athlete with no role. Never partially elevate.
  end if;
  return new;
end;
$$;

create trigger z_redeem_admin_invite
after insert on auth.users
for each row execute function public.redeem_admin_invite();

-- ── Pre-flight validation, read-only ────────────────────────────────────
-- Lets the signup screen check a code BEFORE calling supabase.auth.signUp,
-- so an invalid/expired/mismatched-email code shows a clear error instead
-- of silently creating a plain athlete account with no explanation. Never
-- marks anything used. Exposed to `anon` on purpose (the person hasn't
-- signed up yet) -- deliberately minimal disclosure: returns only a
-- boolean, never which box/role the invite is for, and needs BOTH the
-- code and the matching email to return true, so it can't be used to
-- enumerate valid codes or invited emails separately.
create or replace function public.check_invite_code(p_code text, p_email text)
returns boolean
language sql
security definer
set search_path = 'public'
as $$
  select exists (
    select 1 from public.admin_invites
    where code = p_code
      and used_at is null
      and (expires_at is null or expires_at > now())
      and lower(email) = lower(p_email)
  );
$$;

revoke all on function public.check_invite_code(text, text) from public;
grant execute on function public.check_invite_code(text, text) to anon, authenticated;

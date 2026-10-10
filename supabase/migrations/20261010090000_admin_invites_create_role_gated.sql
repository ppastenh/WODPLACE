-- Closes a real gap in admin_invites: the INSERT policy used
-- user_is_box_staff(box_id), which includes coach — despite this same
-- migration's own comment two lines above it saying "Deliberately no
-- coach write access needed/wanted here" (20261001100000_admin_invite_
-- redemption.sql:22-26). In practice, any coach could create an
-- admin_invites row with role: 'box_admin' for their own box, and later
-- grant themselves the admin role by signing up with that code — a real
-- escalation path, not hypothetical.
--
-- Until the "dueño" (owner) concept lands (tracked separately), this is
-- the temporary rule — matches the "Administrador" option being
-- disabled in the Invitar Staff screen in the same pass:
--   - inviting a COACH requires box_admin (of this box) or super_admin.
--   - inviting a BOX_ADMIN requires super_admin only.
-- Read/delete policies are untouched — this is scoped to the creation
-- hole only, per the explicit ask.

drop policy if exists "box staff create invites for own box" on public.admin_invites;

create policy "role-gated create invites for own box"
on public.admin_invites for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    (
      role = 'coach'
      and exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid()
          and (ur.role = 'super_admin' or (ur.role = 'box_admin' and ur.box_id = admin_invites.box_id))
      )
    )
    or (
      role = 'box_admin'
      and exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid() and ur.role = 'super_admin'
      )
    )
  )
);

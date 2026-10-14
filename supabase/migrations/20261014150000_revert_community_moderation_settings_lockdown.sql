-- Reversa de 20261014140000_community_moderation_settings_lockdown.sql.
-- Solo correr a mano si algo se rompe después de aplicar esa migración.
-- STATUS: probada en rollback.

drop policy if exists "box admin or coach with members_edit insert box_members" on public.box_members;
create policy "box staff insert box_members" on public.box_members
  for insert
  with check (user_is_box_staff(box_id));

drop policy if exists "box admin insert coach_permission_changes" on public.coach_permission_changes;
create policy "box staff insert coach_permission_changes" on public.coach_permission_changes
  for insert
  with check (user_is_box_staff(box_id));

drop policy if exists "box admin delete own box invites" on public.admin_invites;
create policy "box staff delete own box invites" on public.admin_invites
  for delete
  using (user_is_box_staff(box_id));

drop policy if exists "box admin write box_settings" on public.box_settings;
create policy "box staff write box_settings" on public.box_settings
  for all
  using (user_is_box_staff(box_id))
  with check (user_is_box_staff(box_id));

drop policy if exists "box admin resolve social_reports" on public.social_reports;
create policy "box admin resolve social_reports" on public.social_reports
  for update
  using (user_is_box_staff(box_id))
  with check (user_is_box_staff(box_id));

drop policy if exists "admin moderate social_comments" on public.social_comments;
create policy "admin moderate social_comments" on public.social_comments
  for update
  using (user_is_box_staff(box_id))
  with check (user_is_box_staff(box_id));

drop policy if exists "admin moderate social_posts" on public.social_posts;
create policy "admin moderate social_posts" on public.social_posts
  for update
  using (user_is_box_staff(box_id))
  with check (user_is_box_staff(box_id));

drop policy if exists "author or admin delete announcements" on public.announcements;
drop policy if exists "author or admin update announcements" on public.announcements;
drop policy if exists "post as box insert announcements" on public.announcements;

create policy "manage announcements (insert)" on public.announcements
  for insert
  with check (user_has_box_permission(box_id, 'community_post_as_box'));

create policy "manage announcements (update)" on public.announcements
  for update
  using (user_has_box_permission(box_id, 'community_post_as_box'))
  with check (user_has_box_permission(box_id, 'community_post_as_box'));

create policy "manage announcements (delete)" on public.announcements
  for delete
  using (user_has_box_permission(box_id, 'community_post_as_box'));

drop policy if exists "author or admin delete announcement_reactions" on public.announcement_reactions;
drop policy if exists "author or admin update announcement_reactions" on public.announcement_reactions;
drop policy if exists "staff insert own announcement_reactions" on public.announcement_reactions;
create policy "box staff write announcement_reactions" on public.announcement_reactions
  for all
  using (user_is_box_staff(box_id))
  with check (user_is_box_staff(box_id));

drop policy if exists "author or admin delete announcement_comments" on public.announcement_comments;
drop policy if exists "author or admin update announcement_comments" on public.announcement_comments;
drop policy if exists "staff insert own announcement_comments" on public.announcement_comments;
create policy "box staff write announcement_comments" on public.announcement_comments
  for all
  using (user_is_box_staff(box_id))
  with check (user_is_box_staff(box_id));

drop function if exists public.current_wodplace_user_id();

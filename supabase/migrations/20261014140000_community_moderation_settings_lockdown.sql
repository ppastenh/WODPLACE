-- S3, barrido sistemático, Lote 1 (2026-10-14). STATUS: applied 2026-10-14.
--
-- a) Comunidad (comentarios/reacciones/publicaciones de Avisos): exige
--    autoría real -- nadie puede escribir como otro usuario; editar o
--    borrar solo el autor o un administrador/dueño/super admin. El
--    permiso community_post_as_box (publicar como el box) sigue
--    gobernando quién puede publicar/editar/borrar un Aviso -- esto solo
--    agrega que, dentro de quienes tienen ese permiso, cada uno solo
--    toca lo suyo (salvo un administrador, que puede todo).
-- b) Moderación (social_posts/social_comments/social_reports): las 3
--    políticas se llamaban "admin moderate"/"box admin resolve" pero el
--    chequeo real era user_is_box_staff -- cualquier coach podía
--    moderar. Ahora sí exigen administrador/dueño/super admin.
-- c) box_settings, cancelar invitaciones de staff (admin_invites DELETE)
--    y la bitácora de auditoría de permisos (coach_permission_changes
--    INSERT): sin caso de uso de coach encontrado -- pasan a
--    administrador/dueño/super admin.
-- d) box_members INSERT (agregar un miembro nuevo): exige el permiso
--    members_edit del coach, igual que ya exige UPDATE.

-- Resuelve el wodplace_users.id (TEXT) de quien hace la llamada, a partir
-- de auth.uid() -- announcement_comments/reactions.user_id usa ese id,
-- no auth.uid() directo (distinto de announcements.created_by, que SÍ es
-- auth.uid()).
create or replace function public.current_wodplace_user_id()
returns text
language sql stable security definer set search_path = 'public'
as $$
  select id from public.wodplace_users where auth_user_id = auth.uid();
$$;

-- --- a) Comunidad: autoría ---

drop policy if exists "box staff write announcement_comments" on public.announcement_comments;

create policy "staff insert own announcement_comments" on public.announcement_comments
  for insert
  with check (user_is_box_staff(box_id) and user_id = current_wodplace_user_id());

create policy "author or admin update announcement_comments" on public.announcement_comments
  for update
  using (user_is_box_staff(box_id) and (user_id = current_wodplace_user_id() or user_is_box_admin_or_super_admin(box_id)))
  with check (user_is_box_staff(box_id) and (user_id = current_wodplace_user_id() or user_is_box_admin_or_super_admin(box_id)));

create policy "author or admin delete announcement_comments" on public.announcement_comments
  for delete
  using (user_is_box_staff(box_id) and (user_id = current_wodplace_user_id() or user_is_box_admin_or_super_admin(box_id)));

drop policy if exists "box staff write announcement_reactions" on public.announcement_reactions;

create policy "staff insert own announcement_reactions" on public.announcement_reactions
  for insert
  with check (user_is_box_staff(box_id) and user_id = current_wodplace_user_id());

create policy "author or admin update announcement_reactions" on public.announcement_reactions
  for update
  using (user_is_box_staff(box_id) and (user_id = current_wodplace_user_id() or user_is_box_admin_or_super_admin(box_id)))
  with check (user_is_box_staff(box_id) and (user_id = current_wodplace_user_id() or user_is_box_admin_or_super_admin(box_id)));

create policy "author or admin delete announcement_reactions" on public.announcement_reactions
  for delete
  using (user_is_box_staff(box_id) and (user_id = current_wodplace_user_id() or user_is_box_admin_or_super_admin(box_id)));

drop policy if exists "manage announcements (insert)" on public.announcements;
drop policy if exists "manage announcements (update)" on public.announcements;
drop policy if exists "manage announcements (delete)" on public.announcements;

create policy "post as box insert announcements" on public.announcements
  for insert
  with check (user_has_box_permission(box_id, 'community_post_as_box') and created_by = auth.uid());

create policy "author or admin update announcements" on public.announcements
  for update
  using (user_has_box_permission(box_id, 'community_post_as_box') and (created_by = auth.uid() or user_is_box_admin_or_super_admin(box_id)))
  with check (user_has_box_permission(box_id, 'community_post_as_box') and (created_by = auth.uid() or user_is_box_admin_or_super_admin(box_id)));

create policy "author or admin delete announcements" on public.announcements
  for delete
  using (user_has_box_permission(box_id, 'community_post_as_box') and (created_by = auth.uid() or user_is_box_admin_or_super_admin(box_id)));

-- --- b) Moderación: solo administrador/dueño/super admin ---

drop policy if exists "admin moderate social_posts" on public.social_posts;
create policy "admin moderate social_posts" on public.social_posts
  for update
  using (user_is_box_admin_or_super_admin(box_id))
  with check (user_is_box_admin_or_super_admin(box_id));

drop policy if exists "admin moderate social_comments" on public.social_comments;
create policy "admin moderate social_comments" on public.social_comments
  for update
  using (user_is_box_admin_or_super_admin(box_id))
  with check (user_is_box_admin_or_super_admin(box_id));

drop policy if exists "box admin resolve social_reports" on public.social_reports;
create policy "box admin resolve social_reports" on public.social_reports
  for update
  using (user_is_box_admin_or_super_admin(box_id))
  with check (user_is_box_admin_or_super_admin(box_id));

-- --- c) box_settings, cancelar invitaciones, bitácora de permisos ---

drop policy if exists "box staff write box_settings" on public.box_settings;
create policy "box admin write box_settings" on public.box_settings
  for all
  using (user_is_box_admin_or_super_admin(box_id))
  with check (user_is_box_admin_or_super_admin(box_id));

drop policy if exists "box staff delete own box invites" on public.admin_invites;
create policy "box admin delete own box invites" on public.admin_invites
  for delete
  using (user_is_box_admin_or_super_admin(box_id));

drop policy if exists "box staff insert coach_permission_changes" on public.coach_permission_changes;
create policy "box admin insert coach_permission_changes" on public.coach_permission_changes
  for insert
  with check (user_is_box_admin_or_super_admin(box_id));

-- --- d) Agregar un miembro nuevo exige members_edit ---

drop policy if exists "box staff insert box_members" on public.box_members;
create policy "box admin or coach with members_edit insert box_members" on public.box_members
  for insert
  with check (user_has_box_permission(box_id, 'members_edit'));

-- Fase 4 (extras) of the coach permissions rollout, part 1: atomic
-- permission updates. Until now, PermissionsDialog's save (box-admin,
-- more/coaches.tsx) made 3 separate round trips -- update coaches.
-- permissions, upsert box_settings.last_coach_permissions, insert
-- coach_permission_changes -- with no transaction tying them together. A
-- failure between any two of them could leave the audit log missing an
-- entry, or the "last used" template out of sync with what was actually
-- saved. A single function call is one transaction by default: if any step
-- fails, everything rolls back.
--
-- SECURITY INVOKER on purpose (not DEFINER): this runs with the CALLER's
-- own privileges, so it's still gated by exactly the same RLS policies as
-- the 3 separate calls it replaces ("admin manage coaches",
-- box_settings' existing staff policy, coach_permission_changes' insert
-- policy) -- this function grants no one anything they couldn't already do
-- with the old 3-call sequence, it only makes those 3 calls atomic.
create or replace function public.update_coach_permissions(
  p_coach_id text,
  p_new_permissions jsonb,
  p_changed_by_email text
)
returns public.coaches
language plpgsql
security invoker
set search_path = 'public'
as $$
declare
  v_box_id text;
  v_before jsonb;
  v_changes jsonb;
  v_row public.coaches;
begin
  select box_id, permissions into v_box_id, v_before
  from public.coaches
  where id = p_coach_id;

  if v_box_id is null then
    raise exception 'Coach % not found', p_coach_id;
  end if;

  update public.coaches
  set permissions = p_new_permissions, updated_at = now()
  where id = p_coach_id
  returning * into v_row;

  insert into public.box_settings (box_id, key, value)
  values (v_box_id, 'last_coach_permissions', p_new_permissions::text)
  on conflict (box_id, key) do update set value = excluded.value, updated_at = now();

  -- Only the keys that actually flipped -- same "noisy log" avoidance the
  -- old client-side diff already had, just computed in SQL now so it's the
  -- one place this logic lives.
  select coalesce(jsonb_object_agg(k, jsonb_build_object('from', v_before -> k, 'to', p_new_permissions -> k)), '{}'::jsonb)
  into v_changes
  from jsonb_object_keys(p_new_permissions) as k
  where (v_before -> k) is distinct from (p_new_permissions -> k);

  if v_changes <> '{}'::jsonb then
    insert into public.coach_permission_changes (box_id, coach_id, changed_by, changed_by_email, changes)
    values (v_box_id, p_coach_id, auth.uid()::text, p_changed_by_email, v_changes);
  end if;

  return v_row;
end;
$$;

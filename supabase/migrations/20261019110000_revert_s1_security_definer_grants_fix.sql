-- Reversa de 20261019100000_s1_security_definer_grants_fix.sql. Solo
-- correr a mano si algo se rompe después de aplicar esa migración.
-- STATUS: probada en una transacción con ROLLBACK.

alter default privileges for role postgres grant execute on functions to public;

revoke execute on function public.user_is_box_admin_or_super_admin(text) from anon;

grant execute on function public.check_invite_code(text, text) to anon, authenticated;

grant execute on function public.app_setting_bool(text) to authenticated;

grant execute on function public.app_setting_bool(text) to anon, public;
grant execute on function public.app_settings_audit_trigger() to anon, public, authenticated;
grant execute on function public.box_member_contract_signed_physically_at(text, text) to anon, public;
grant execute on function public.box_member_contract_signed_physically_by(text, text) to anon, public;
grant execute on function public.box_member_emergency_contact(text, text) to anon, public;
grant execute on function public.box_owner_user_id(text) to anon, public;
grant execute on function public.box_status(text) to anon, public;
grant execute on function public.current_wodplace_user_id() to anon, public;
grant execute on function public.enforce_payment_box_consistency() to anon, public, authenticated;
grant execute on function public.is_aal2_enforced() to anon, public;
grant execute on function public.user_is_box_admin_or_super_admin(text) to anon, public;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coach';

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{
    "classes_create": true,
    "classes_edit": true,
    "attendance_mark": true,
    "members_view": true,
    "members_edit": false,
    "bookings_manage": true,
    "prs_manage": true,
    "finances_view": false,
    "payments_register": false,
    "files_manage": false
  }'::jsonb;

CREATE INDEX IF NOT EXISTS coaches_user_id_idx ON public.coaches(user_id);

ALTER TABLE public.admin_invites
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';

ALTER TABLE public.admin_invites
  DROP CONSTRAINT IF EXISTS admin_invites_role_check;
ALTER TABLE public.admin_invites
  ADD CONSTRAINT admin_invites_role_check CHECK (role IN ('admin', 'coach'));

DROP POLICY IF EXISTS "Coaches read own record" ON public.coaches;
CREATE POLICY "Coaches read own record" ON public.coaches
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_exists BOOLEAN;
  invite_code TEXT;
  invite_row public.admin_invites%ROWTYPE;
  assigned_role public.app_role := 'user';
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  invite_code := NULLIF(trim(NEW.raw_user_meta_data->>'invite_code'), '');

  IF invite_code IS NOT NULL THEN
    SELECT * INTO invite_row
    FROM public.admin_invites
    WHERE code = invite_code
      AND used_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
      AND (email IS NULL OR lower(email) = lower(NEW.email))
    LIMIT 1;

    IF FOUND THEN
      assigned_role := invite_row.role::public.app_role;
      UPDATE public.admin_invites
      SET used_at = now(), used_by = NEW.id
      WHERE id = invite_row.id;

      IF invite_row.role = 'coach' THEN
        UPDATE public.coaches
        SET user_id = NEW.id
        WHERE user_id IS NULL AND lower(email) = lower(NEW.email);

        IF NOT FOUND THEN
          INSERT INTO public.coaches (full_name, email, user_id)
          VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email, NEW.id);
        END IF;
      END IF;
    END IF;
  END IF;

  IF assigned_role = 'user' THEN
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO admin_exists;
    IF NOT admin_exists THEN
      assigned_role := 'admin';
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$function$;
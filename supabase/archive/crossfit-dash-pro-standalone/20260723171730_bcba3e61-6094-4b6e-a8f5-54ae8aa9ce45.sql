
CREATE TABLE public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  email text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_invites TO authenticated;
GRANT ALL ON public.admin_invites TO service_role;

ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invites"
  ON public.admin_invites
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX admin_invites_code_idx ON public.admin_invites (code);

-- Update signup trigger to consume invite codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      assigned_role := 'admin';
      UPDATE public.admin_invites
      SET used_at = now(), used_by = NEW.id
      WHERE id = invite_row.id;
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
$$;

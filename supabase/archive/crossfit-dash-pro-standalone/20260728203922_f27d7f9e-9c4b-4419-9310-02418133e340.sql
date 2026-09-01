
-- Enum for request status
DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM ('pendiente','aprobado','rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Box settings (singleton)
CREATE TABLE IF NOT EXISTS public.box_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.box_settings TO anon, authenticated;
GRANT ALL ON public.box_settings TO service_role;
ALTER TABLE public.box_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read box settings" ON public.box_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage box settings" ON public.box_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER box_settings_updated_at BEFORE UPDATE ON public.box_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial code
INSERT INTO public.box_settings (invite_code)
SELECT upper(substring(replace(gen_random_uuid()::text,'-','') from 1 for 8))
WHERE NOT EXISTS (SELECT 1 FROM public.box_settings);

-- Member requests
CREATE TABLE IF NOT EXISTS public.member_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  code_used TEXT,
  status public.request_status NOT NULL DEFAULT 'pendiente',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_requests TO authenticated;
GRANT INSERT ON public.member_requests TO anon;
GRANT ALL ON public.member_requests TO service_role;
ALTER TABLE public.member_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a request" ON public.member_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins manage requests" ON public.member_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER member_requests_updated_at BEFORE UPDATE ON public.member_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

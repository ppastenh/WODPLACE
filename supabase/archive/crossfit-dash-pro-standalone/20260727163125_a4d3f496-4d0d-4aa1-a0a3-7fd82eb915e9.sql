
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  doc_type text NOT NULL DEFAULT 'contrato',
  file_name text NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read contracts" ON public.contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage contracts" ON public.contracts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.contract_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.contract_acceptances TO authenticated;
GRANT ALL ON public.contract_acceptances TO service_role;
ALTER TABLE public.contract_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own acceptances" ON public.contract_acceptances FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own acceptance" ON public.contract_acceptances FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins delete acceptances" ON public.contract_acceptances FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Reset acceptances when a contract file is replaced (updated_at bumped via new upload path)
CREATE OR REPLACE FUNCTION public.reset_contract_acceptances()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.storage_path IS DISTINCT FROM OLD.storage_path THEN
    DELETE FROM public.contract_acceptances WHERE contract_id = OLD.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_contracts_reset_acceptances AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.reset_contract_acceptances();

-- Storage policies for the private 'contracts' bucket
CREATE POLICY "Auth read contracts bucket" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contracts');
CREATE POLICY "Admins upload contracts" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update contracts" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contracts' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete contracts" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contracts' AND has_role(auth.uid(), 'admin'::app_role));

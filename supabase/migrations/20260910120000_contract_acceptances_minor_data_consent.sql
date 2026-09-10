-- Minors: an explicit, separate consent for processing the minor's
-- personal data for this app's purposes — distinct from accepting the
-- box's contract itself, and with its own timestamp. Nullable: only set
-- for members who accepted while under 18. Adults never fill it.
alter table public.contract_acceptances
  add column if not exists minor_data_consent_at timestamptz;

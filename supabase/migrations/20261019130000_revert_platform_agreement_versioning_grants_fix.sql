-- Reversa de 20261019120000_platform_agreement_versioning_grants_fix.sql.
-- Solo correr a mano si algo se rompe después de aplicar esa migración.
-- STATUS: probada en una transacción con ROLLBACK.

grant select, insert, update, delete, truncate, references, trigger
  on table public.platform_agreement_document_versions to anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger
  on table public.platform_agreement_acceptance_history to anon, authenticated;

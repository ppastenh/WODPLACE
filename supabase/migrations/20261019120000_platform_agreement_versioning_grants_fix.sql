-- Mismo hallazgo del Security Advisor (ver 20261019100000) aplicado a las
-- 2 tablas nuevas del versionado del Acuerdo de Plataforma
-- (platform_agreement_document_versions, platform_agreement_acceptance_history):
-- nacieron con privilegios de tabla para anon/authenticated por el
-- default de Postgres, aunque tienen RLS activada sin ninguna política
-- (solo la conexión de servicio las toca, por diseño). Confirmado por la
-- API pública: SELECT/INSERT/DELETE con la clave anónima ya daban 401
-- "permission denied for table" por RLS -- este REVOKE es defensa en
-- profundidad, no corrige una fuga real.
--
-- STATUS: aplicada en producción el 2026-10-19.

revoke all on table public.platform_agreement_document_versions from anon, authenticated;
revoke all on table public.platform_agreement_acceptance_history from anon, authenticated;

# supabase/propuestas/

Material **propuesto, NO aplicado**. Esta carpeta está a propósito fuera de `supabase/migrations/`: las migraciones de este proyecto se corren a mano (SQL Editor o `DATABASE_URL`), nada las aplica sola, y nada de lo que hay aquí se ejecuta con ellas. Cuando Pía aprueba una propuesta, el SQL pasa a `supabase/migrations/` con su reversa, se corren `check:super-admin-inlining` y `check:security-definer-grants`, y recién entonces se aplica.

- `20261024_super_admin_audit_log_cambio_de_codigo.diff`: cambio opcional de código de super-admin (la migración correspondiente ya fue aplicada el 2026-10-24).

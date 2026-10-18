/**
 * Defensa a futuro (S3-B, 2026-10): is_super_admin()/user_is_super_admin()
 * son las ÚNICAS funciones autorizadas a decidir "es super admin" contra
 * user_roles -- ver la regla en CLAUDE.md. Cualquier otra función, política
 * RLS o vista que contenga el literal 'super_admin' está, por definición,
 * decidiéndolo por su cuenta otra vez (inline), saltándose el interruptor
 * aal2 de app_settings sin que nadie lo note.
 *
 * Corre con: pnpm --filter @workspace/scripts check:super-admin-inlining
 * Sale con código 1 (falla) si encuentra algo.
 */
import { Client } from "pg";

/**
 * Toda excepción a la regla "el rol super_admin se decide solo con
 * is_super_admin()" vive AQUÍ, a propósito, con su razón -- nunca se agrega
 * una excepción nueva solo para que el check pase.
 */
const ALLOWED_FUNCTIONS: Record<string, string> = {
  is_super_admin: "es la función canónica -- define el chequeo, no lo repite.",
  user_is_super_admin:
    "delega en is_super_admin() -- su propio cuerpo contiene el literal solo porque is_super_admin() lo contiene (vía pg_get_functiondef), no porque lo repita.",
  box_members_contract_status:
    "su chequeo de 'super_admin' es sobre un ALUMNO del listado (m.auth_user_id), no sobre quién llama (auth.uid()) -- decide si mostrar estado de contrato a una fila de staff, no si el caller puede actuar como super admin. Ver CLAUDE.md / ESTADO.md (S3-B, 2026-10-16).",
};

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const violations: string[] = [];

  const funcs = await client.query<{ nspname: string; proname: string; def: string }>(`
    select ns.nspname, p.proname, pg_get_functiondef(p.oid) as def
    from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname in ('public', 'private')
      and p.prosrc ilike '%''super_admin''%'
  `);
  for (const row of funcs.rows) {
    if (row.proname in ALLOWED_FUNCTIONS) continue;
    violations.push(
      `función ${row.nspname}.${row.proname}: contiene el literal 'super_admin' directamente, en vez de llamar a is_super_admin()`,
    );
  }

  const policies = await client.query<{
    schemaname: string;
    tablename: string;
    policyname: string;
    qual: string | null;
    with_check: string | null;
  }>(`
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname in ('public', 'storage')
      and (qual ilike '%''super_admin''%' or with_check ilike '%''super_admin''%')
  `);
  for (const row of policies.rows) {
    violations.push(
      `política "${row.policyname}" en ${row.schemaname}.${row.tablename}: contiene el literal 'super_admin' directamente, en vez de llamar a is_super_admin()`,
    );
  }

  const views = await client.query<{ table_schema: string; table_name: string }>(`
    select table_schema, table_name
    from information_schema.views
    where table_schema in ('public')
      and view_definition ilike '%''super_admin''%'
  `);
  for (const row of views.rows) {
    violations.push(`vista ${row.table_schema}.${row.table_name}: contiene el literal 'super_admin' directamente`);
  }

  if (violations.length === 0) {
    console.log("OK: nada decide 'es super admin' fuera de is_super_admin()/user_is_super_admin().");
    await client.end();
    return;
  }

  console.error(`Encontré ${violations.length} lugar(es) que deciden 'super_admin' sin pasar por is_super_admin():\n`);
  for (const v of violations) console.error(" - " + v);
  await client.end();
  process.exit(1);
}

main().catch((e) => {
  console.error("ERROR corriendo check-super-admin-inlining:", e);
  process.exit(1);
});

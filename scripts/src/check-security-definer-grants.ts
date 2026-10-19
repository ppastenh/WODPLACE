/**
 * Defensa a futuro (hallazgo del Security Advisor, 2026-10-19): toda función
 * SECURITY DEFINER nace con EXECUTE para anon/authenticated/PUBLIC por el
 * comportamiento estándar de Postgres (EXECUTE ON FUNCTIONS se otorga a
 * PUBLIC por defecto). La causa raíz SÍ tiene arreglo, pero el orden exacto
 * importa -- un primer intento con
 * `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ...`
 * no funcionó (probado creando una función nueva en rollback: igual nació
 * abierta). La forma que SÍ funciona, aplicada en producción el
 * 2026-10-19 y verificada igual (función nueva creada y luego borrada,
 * nace cerrada):
 *   ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
 * -- SIN "IN SCHEMA": un default por esquema no alcanza a pisar el default
 * global de PUBLIC; hay que revocarlo a nivel global para ese rol. Aun así,
 * este script sigue siendo obligatorio antes de cualquier commit que toque
 * migraciones -- es la red que detecta cualquier excepción futura (una
 * función creada por otro rol, un GRANT explícito posterior, etc.), no
 * solo confía en el default.
 *
 * Corre con: pnpm --filter @workspace/scripts check:security-definer-grants
 * Sale con código 1 (falla) si encuentra una función SECURITY DEFINER
 * ejecutable por anon o por authenticated que no esté en las listas de
 * abajo, con su razón.
 */
import { Client } from "pg";

/**
 * Toda función SECURITY DEFINER a la que `anon` (sin sesión, la clave
 * pública) puede llamar directamente por la API. Vacía a propósito --
 * ninguna función de este catálogo necesita ser pública hoy (incluso
 * is_aal2_enforced, que SÍ es pública por diseño en su propósito, solo la
 * llaman clientes ya autenticados -- ver super-admin/src/lib/mfa.ts -- así
 * que no necesita el grant de anon). Si algo nuevo de verdad necesita ser
 * público, se agrega aquí con su razón, nunca en silencio.
 */
const ALLOWED_ANON: Record<string, string> = {
  user_is_box_admin_or_super_admin:
    "varias políticas RLS (boxes, payments, plans, box_settings, classes, member_invites, coaches, class_bookings, class_sessions, member_requests) la llaman DIRECTO en su USING/WITH CHECK -- revocarle EXECUTE a anon hace que una simple lectura sin sesión truene con 'permission denied for function' en vez de devolver vacío (encontrado y corregido el 2026-10-19, ver ESTADO.md). Segura de exponer: solo informa del propio llamador (auth.uid()), nunca de otra cuenta.",
};

/**
 * Toda función SECURITY DEFINER a la que `authenticated` (cualquier sesión
 * con un JWT válido, sin importar su rol) puede llamar directamente por la
 * API -- con la razón de por qué es seguro que cualquier cuenta logueada
 * pueda invocarla.
 */
const ALLOWED_AUTHENTICATED: Record<string, string> = {
  box_member_contract_signed_physically_at:
    "chequea internamente user_is_box_staff(_box_id) o que _user_id sea el propio llamador -- nunca filtra el dato de otra cuenta.",
  box_member_contract_signed_physically_by: "mismo chequeo interno que la anterior.",
  box_member_emergency_contact: "chequea internamente user_is_box_admin_or_super_admin(_box_id).",
  box_member_next_payment_at: "chequea internamente user_is_box_staff(_box_id) o el propio llamador.",
  box_member_plan_id: "mismo chequeo interno que box_member_next_payment_at.",
  box_members_contract_status: "chequea internamente user_is_box_admin_or_super_admin(_box_id).",
  box_owner_user_id:
    "SIN chequeo interno propio -- cualquier cuenta logueada puede leer el owner_user_id de CUALQUIER box (hallazgo aceptado, severidad baja: un uuid interno, no datos personales). No se puede revocar: la política RLS de UPDATE sobre `boxes` la llama en su WITH CHECK, y revocarle EXECUTE a `authenticated` rompería que un box_admin pueda editar su propio box. Ver ESTADO.md 2026-10-19 para la propuesta de arreglarlo de raíz (ej. mover el chequeo a un trigger) más adelante.",
  box_status: "mismo caso y misma razón que box_owner_user_id (la misma política RLS la usa).",
  coach_current: "chequea internamente user_is_box_staff(c.box_id) o que el coach sea el propio llamador.",
  contract_acceptance_immutable_snapshot: "chequea internamente user_is_box_staff(box_id) o el propio llamador.",
  current_wodplace_user_id: "solo puede devolver el propio id del llamador (auth.uid()), nunca el de otra cuenta.",
  delete_contract_document: "exige user_is_box_owner_or_super_admin(p_box_id), con excepción explícita si no.",
  is_aal2_enforced: "diseñada para ser pública -- revela solo si el interruptor global está encendido, nunca datos de una cuenta.",
  is_super_admin: "solo informa del propio llamador (auth.uid()), nunca de otra cuenta.",
  my_coach_id: "solo puede devolver el coach_id del propio llamador (c.user_id = auth.uid()).",
  remove_coach_role: "exige is_super_admin() o ser box_admin de ESE box, con excepción explícita si no.",
  replace_contract_document: "exige user_is_box_owner_or_super_admin(p_box_id), con excepción explícita si no.",
  session_coach_id: "chequea internamente user_is_box_staff(cs.box_id).",
  user_has_box_permission: "solo informa del propio llamador (auth.uid()), nunca de otra cuenta.",
  user_is_any_box_admin: "mismo caso que user_has_box_permission.",
  user_is_box_admin_or_super_admin: "mismo caso que user_has_box_permission.",
  user_is_box_owner_or_super_admin: "mismo caso que user_has_box_permission.",
  user_is_box_staff: "mismo caso que user_has_box_permission.",
  user_is_super_admin: "delega en is_super_admin() -- mismo caso.",
};

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const funcs = await client.query<{ proname: string }>(`
    select p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and p.prosecdef = true
  `);

  const violations: string[] = [];

  for (const { proname } of funcs.rows) {
    const [{ rows: anonRows }, { rows: authRows }] = await Promise.all([
      client.query<{ exec: boolean }>(
        `select has_function_privilege('anon', (select oid from pg_proc where proname = $1 limit 1), 'EXECUTE') as exec`,
        [proname],
      ),
      client.query<{ exec: boolean }>(
        `select has_function_privilege('authenticated', (select oid from pg_proc where proname = $1 limit 1), 'EXECUTE') as exec`,
        [proname],
      ),
    ]);

    if (anonRows[0]?.exec && !(proname in ALLOWED_ANON)) {
      violations.push(`función public.${proname}: EXECUTE concedido a 'anon' sin estar en ALLOWED_ANON`);
    }
    if (authRows[0]?.exec && !(proname in ALLOWED_AUTHENTICATED)) {
      violations.push(`función public.${proname}: EXECUTE concedido a 'authenticated' sin estar en ALLOWED_AUTHENTICATED`);
    }
  }

  if (violations.length === 0) {
    console.log(
      "OK: ninguna función SECURITY DEFINER tiene EXECUTE para anon/authenticated fuera de las listas explícitas.",
    );
    await client.end();
    return;
  }

  console.error(`Encontré ${violations.length} función(es) con EXECUTE inesperado:\n`);
  for (const v of violations) console.error(" - " + v);
  await client.end();
  process.exit(1);
}

main().catch((e) => {
  console.error("ERROR corriendo check-security-definer-grants:", e);
  process.exit(1);
});

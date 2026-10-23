import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

import { isSuperAdminAuthorized } from "./aal2Enforcement";
import { resolveAdminRoles } from "./adminRole";
import { emailForWodplaceUserId } from "./boxOwnership";

/**
 * Incidente 2026-10-22: cualquier cuenta con sesión podía conseguir un token
 * de administrador (POST /admin/pin/setup no pide rol) y las rutas de
 * "moderación" lo aceptaban sin mirar a qué box pertenece lo que se borra.
 *
 * Esta función decide si `userId` (el wodplace_users.id que firmó el token de
 * administrador) puede borrar contenido AJENO de `boxId`: solo
 *   - box_admin DE ESE MISMO box (user_roles.box_id = boxId),
 *   - el dueño de ese box (boxes.owner_user_id),
 *   - un super_admin, y solo si isSuperAdminAuthorized lo permite (con el
 *     interruptor aal2 encendido, un token de administrador no trae el aal
 *     de la sesión, así que falla cerrado: el super admin modera desde su panel).
 * Un coach, un box_admin de OTRO box o un alumno sin roles: false.
 */
export async function canModerateBoxContent(
  userId: string,
  boxId: string,
  callerAal: string | null,
): Promise<boolean> {
  const email = await emailForWodplaceUserId(userId);
  if (!email) return false;

  const scoped = await db.execute<{ ok: number }>(sql`
    select 1 as ok
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    where lower(p.email) = lower(${email})
      and ur.role = 'box_admin'
      and ur.box_id::text = ${boxId}
    union all
    select 1 as ok
    from public.profiles p
    join public.boxes b on b.owner_user_id = p.id
    where lower(p.email) = lower(${email})
      and b.id::text = ${boxId}
    limit 1
  `);
  if (scoped.rows.length > 0) return true;

  const roles = await resolveAdminRoles(email);
  if (roles.includes("super_admin") && (await isSuperAdminAuthorized(callerAal))) return true;

  return false;
}

import { db, wodplaceUsersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

import { resolveAdminRoles } from "./adminRole";
import { isSuperAdminAuthorized } from "./aal2Enforcement";

export async function emailForWodplaceUserId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ email: wodplaceUsersTable.email })
    .from(wodplaceUsersTable)
    .where(eq(wodplaceUsersTable.id, userId));
  return row?.email ?? null;
}

/**
 * True for `boxId`'s owner (boxes.owner_user_id) or any super_admin.
 * `callerAal` -- el claim `aal` del JWT YA VERIFICADO del llamador (ver
 * resolveSupabaseUser) -- solo importa para la rama de super_admin; la
 * rama de dueño nunca lo mira (S3-B, escenario (a): una dueña de box que
 * también es super_admin conserva su acceso de dueña aunque el
 * interruptor esté encendido y su sesión sea aal1).
 */
export async function isBoxOwnerOrSuperAdmin(
  userId: string,
  boxId: string,
  callerAal: string | null,
): Promise<boolean> {
  const email = await emailForWodplaceUserId(userId);
  if (!email) return false;

  const roles = await resolveAdminRoles(email);
  if (roles.includes("super_admin") && (await isSuperAdminAuthorized(callerAal))) return true;

  const owned = await db.execute<{ id: string }>(sql`
    select b.id from public.boxes b
    join public.profiles p on p.id = b.owner_user_id
    where lower(p.email) = lower(${email}) and b.id = ${boxId}
  `);
  return owned.rows.length > 0;
}

/**
 * True for any admin role at all (box_admin, coach, or super_admin).
 * `callerAal` solo importa cuando el ÚNICO rol que calificaría es
 * super_admin -- box_admin/coach nunca lo necesitan.
 */
export async function isAnyStaff(userId: string, callerAal: string | null): Promise<boolean> {
  const email = await emailForWodplaceUserId(userId);
  if (!email) return false;
  const roles = await resolveAdminRoles(email);
  if (roles.some((r) => r === "box_admin" || r === "coach")) return true;
  if (roles.includes("super_admin")) return isSuperAdminAuthorized(callerAal);
  return false;
}

import { db, wodplaceUsersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

import { resolveAdminRoles } from "./adminRole";

export async function emailForWodplaceUserId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ email: wodplaceUsersTable.email })
    .from(wodplaceUsersTable)
    .where(eq(wodplaceUsersTable.id, userId));
  return row?.email ?? null;
}

/** True for `boxId`'s owner (boxes.owner_user_id) or any super_admin. */
export async function isBoxOwnerOrSuperAdmin(
  userId: string,
  boxId: string,
): Promise<boolean> {
  const email = await emailForWodplaceUserId(userId);
  if (!email) return false;

  const roles = await resolveAdminRoles(email);
  if (roles.includes("super_admin")) return true;

  const owned = await db.execute<{ id: string }>(sql`
    select b.id from public.boxes b
    join public.profiles p on p.id = b.owner_user_id
    where lower(p.email) = lower(${email}) and b.id = ${boxId}
  `);
  return owned.rows.length > 0;
}

/** True for any admin role at all (box_admin, coach, or super_admin). */
export async function isAnyStaff(userId: string): Promise<boolean> {
  const email = await emailForWodplaceUserId(userId);
  if (!email) return false;
  const roles = await resolveAdminRoles(email);
  return roles.length > 0;
}

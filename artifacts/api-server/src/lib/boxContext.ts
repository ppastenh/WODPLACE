import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Resolves the box every box-scoped feature (contract documents, box
 * settings, ...) should operate on.
 *
 * The shared Supabase project is multi-box, but WODPLACE currently runs a
 * single box. When an `ownerUserId` is given (an admin acting on their own
 * box) the box they own wins; otherwise — and as the fallback while
 * `boxes.owner_user_id` hasn't been assigned yet — the sole/oldest box is
 * used. `boxes` is Supabase-managed, so it is queried with raw SQL rather
 * than modelled in `@workspace/db`.
 *
 * Throws when no box exists at all (a misconfigured project) so callers
 * surface a clear 500 instead of a not-null constraint violation deep in an
 * insert.
 */
export async function resolveBoxId(ownerUserId?: string | null): Promise<string> {
  if (ownerUserId) {
    const owned = await db.execute<{ id: string }>(sql`
      SELECT id FROM boxes
      WHERE owner_user_id = ${ownerUserId}
      ORDER BY created_at
      LIMIT 1
    `);
    if (owned.rows[0]) return owned.rows[0].id;
  }

  const any = await db.execute<{ id: string }>(sql`
    SELECT id FROM boxes ORDER BY created_at LIMIT 1
  `);
  if (any.rows[0]) return any.rows[0].id;

  throw new Error("No box exists to attach box-scoped rows to");
}

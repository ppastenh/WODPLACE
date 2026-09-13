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

/**
 * Same idea as `resolveBoxId`, but starting from a wodplace-side identity
 * (a `wodplace_users.id`, e.g. from an admin session token) rather than
 * already having the real Supabase Auth id `boxes.owner_user_id` points at.
 * Bridges through `profiles` by email, same pattern as lib/adminRole.ts —
 * necessary because passing the wodplace id straight into `resolveBoxId`
 * would never match `owner_user_id` (a different identity space) and would
 * silently fall back to "the oldest box", which is only harmless while a
 * single real box exists.
 */
export async function resolveBoxIdForWodplaceUserId(
  wodplaceUserId: string,
): Promise<string> {
  const owned = await db.execute<{ id: string }>(sql`
    SELECT b.id
    FROM public.wodplace_users wu
    JOIN public.profiles p ON lower(p.email) = lower(wu.email)
    JOIN public.boxes b ON b.owner_user_id = p.id
    WHERE wu.id = ${wodplaceUserId}
    ORDER BY b.created_at
    LIMIT 1
  `);
  if (owned.rows[0]) return owned.rows[0].id;
  return resolveBoxId(null);
}

/**
 * Resolves the box a mobile ATHLETE (not an admin) belongs to, via
 * `box_members` — the join-code redemption table, a completely different
 * relationship than `boxes.owner_user_id` used by the two functions above.
 * Unlike those, this deliberately does NOT fall back to "the oldest box":
 * an athlete who hasn't joined any box has no box, full stop — silently
 * handing them the platform's founding box's content would defeat the
 * point of per-box Comunidad scoping. Callers (social.ts) treat `null` as
 * "nothing to show / nothing to attach this to" rather than erroring.
 *
 * When an athlete belongs to more than one box, the most recently joined
 * one wins — same "one active box" assumption as GET /box-memberships/my-box.
 */
export async function resolveBoxIdForAthlete(
  wodplaceUserId: string,
): Promise<string | null> {
  const rows = await db.execute<{ box_id: string }>(sql`
    SELECT box_id FROM box_members
    WHERE user_id = ${wodplaceUserId}
    ORDER BY created_at DESC
    LIMIT 1
  `);
  return rows.rows[0]?.box_id ?? null;
}

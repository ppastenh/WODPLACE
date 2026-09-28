import { db, wodplaceUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

import { getSupabaseAdmin } from "./supabaseAdmin";

/**
 * Fase 1 of the wodplace mock-auth -> real Supabase Auth migration. Not
 * enforced on any existing route yet — see /api/auth/whoami for the
 * proof-of-concept this was built to prove out end-to-end (wodplace's
 * Supabase client -> JWT -> this verification -> real identity), before
 * any real endpoint starts requiring it. Every other wodplace endpoint
 * still trusts a plain `userId` param, exactly as before.
 *
 * Verifies the `Authorization: Bearer <token>` header against Supabase
 * (via the service-role client, same one the admin auto-login flow already
 * uses) and resolves the real `auth.users` identity — not the
 * `wodplace_users.id` a request might separately claim to be acting as.
 * Callers still need to cross-check that against
 * wodplace_users.auth_user_id themselves; this only proves "which
 * Supabase account, if any, made this request."
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      supabaseUser?: { id: string; email: string | null };
    }
  }
}

export async function resolveSupabaseUser(
  req: Request,
): Promise<{ id: string; email: string | null } | null> {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

/** Rejects with 401 unless a valid Supabase JWT is present. */
export async function requireSupabaseUser(req: Request, res: Response, next: NextFunction) {
  const user = await resolveSupabaseUser(req);
  if (!user) {
    res.status(401).json({ error: "Missing or invalid Authorization token" });
    return;
  }
  req.supabaseUser = user;
  next();
}

/**
 * Fase 4 of the migration: the enforcement guard every wodplace endpoint
 * that acts on a specific `userId` calls right after validating its own
 * request shape. Dual-mode by design, keyed off whether THIS TARGET
 * ACCOUNT has been migrated yet (wodplace_users.auth_user_id), not off
 * whether the request happens to carry a token:
 *
 *   - Not migrated yet (auth_user_id is null): today's trust model,
 *     unchanged — the client-supplied userId is trusted as-is. Every
 *     still-mock account (and any that somehow isn't migrated later)
 *     keeps working exactly as before.
 *   - Migrated (auth_user_id set): a valid Supabase JWT is now REQUIRED,
 *     and it must belong to THIS SAME account — closes the hole where
 *     anyone who knows another athlete's id could read/write their data.
 *
 * Call this manually (not as router middleware) because the userId's
 * source varies per route (query/body/params) and is already extracted
 * by that route's own zod parse by the time this runs. Writes the 404/
 * 401/403 response itself; callers just check the boolean and `return`.
 */
export async function assertOwnsAccount(
  req: Request,
  res: Response,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ authUserId: wodplaceUsersTable.authUserId })
    .from(wodplaceUsersTable)
    .where(eq(wodplaceUsersTable.id, userId));

  if (!row) {
    res.status(404).json({ error: "User not found" });
    return false;
  }
  if (row.authUserId === null) {
    return true;
  }

  const supabaseUser = await resolveSupabaseUser(req);
  if (!supabaseUser) {
    res.status(401).json({ error: "Missing or invalid Authorization token" });
    return false;
  }
  if (supabaseUser.id !== row.authUserId) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

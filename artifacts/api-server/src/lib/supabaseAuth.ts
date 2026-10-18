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
export type VerifiedSupabaseUser = { id: string; email: string | null; aal: string | null };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      supabaseUser?: VerifiedSupabaseUser;
    }
  }
}

/**
 * Lee el claim `aal` del JWT -- SOLO se llama después de que
 * `getSupabaseAdmin().auth.getUser(token)` ya verificó ese mismo token
 * contra Supabase. Nunca se usa este decode para autenticar por su
 * cuenta; es leer un campo extra de un token cuya firma ya se comprobó.
 */
function decodeAalFromVerifiedToken(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      aal?: unknown;
    };
    return typeof json.aal === "string" ? json.aal : null;
  } catch {
    return null;
  }
}

export async function resolveSupabaseUser(req: Request): Promise<VerifiedSupabaseUser | null> {
  // Memoizado en el propio request -- varias llamadas dentro de la misma
  // petición (ej. assertOwnsAccount y luego un chequeo de aal) no repiten
  // el viaje de red a Supabase.
  if (req.supabaseUser) return req.supabaseUser;

  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  const result: VerifiedSupabaseUser = {
    id: data.user.id,
    email: data.user.email ?? null,
    aal: decodeAalFromVerifiedToken(token),
  };
  req.supabaseUser = result;
  return result;
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
 * Fase 4 of the migration, now fully fail-closed (userId Fase 1 de la
 * auditoría de seguridad, 2026-10-13): the enforcement guard every
 * wodplace endpoint that acts on a specific `userId` calls right after
 * validating its own request shape.
 *
 * A valid Supabase JWT is ALWAYS required, and it must belong to THIS
 * SAME account (wodplace_users.auth_user_id) — there is no more "not
 * migrated yet, trust the client-supplied userId" branch. POST /users
 * (the only place a row is ever created) always sets auth_user_id from
 * the caller's own JWT now, so every row that exists has one; a row
 * with no auth_user_id at this point is pre-existing leftover data, not
 * a route this function should ever trust.
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

  const supabaseUser = await resolveSupabaseUser(req);
  if (!supabaseUser) {
    res.status(401).json({ error: "Missing or invalid Authorization token" });
    return false;
  }
  if (!row.authUserId || supabaseUser.id !== row.authUserId) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

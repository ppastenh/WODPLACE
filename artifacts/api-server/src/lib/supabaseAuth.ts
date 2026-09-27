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

async function resolveSupabaseUser(
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

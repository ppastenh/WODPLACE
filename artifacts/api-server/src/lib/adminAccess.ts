import { db, wodplaceUsersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

import { isSuperAdminAuthorized } from "./aal2Enforcement";
import { verifyAdminToken, type AdminTokenClaims } from "./adminToken";
import { assertOwnsAccount, resolveSupabaseUser } from "./supabaseAuth";

/**
 * Incidente 2026-10-22: el token de administrador se entregaba a cualquier
 * cuenta con sesión y las rutas lo aceptaban sin mirar usuario, rol ni box.
 * TODO lo que decide "esta persona es administradora de este box" vive aquí:
 *
 *  - roles que dan acceso a un panel hoy (los mismos que muestran el ítem
 *    "Administrador"/"Coach" en la app): box_admin, coach y super_admin;
 *  - dueño del box (boxes.owner_user_id) cuenta como box_admin de ese box;
 *  - super_admin solo vale si isSuperAdminAuthorized(aal) lo permite (aal2
 *    cuando el interruptor está encendido) -- el aal sale de la sesión de
 *    Supabase VERIFICADA de esta misma petición, nunca del token.
 *
 * El rol se vuelve a leer en cada petición: quitar un rol corta el acceso de
 * inmediato, sin esperar a que venza el token.
 */

export type PanelAccess = {
  /** ¿Puede tener un token de administrador (cualquier rol de panel)? */
  allowed: boolean;
  /** Boxes donde administra (box_admin o dueño). */
  manageBoxIds: string[];
  /** Boxes donde es coach. */
  coachBoxIds: string[];
  /** Super admin ya autorizado (aal2 si corresponde). */
  isSuper: boolean;
};

export async function authUserIdForWodplaceUser(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ authUserId: wodplaceUsersTable.authUserId })
    .from(wodplaceUsersTable)
    .where(eq(wodplaceUsersTable.id, userId));
  return row?.authUserId ?? null;
}

export async function resolvePanelAccess(
  authUserId: string,
  callerAal: string | null,
): Promise<PanelAccess> {
  const rows = await db.execute<{ kind: string; box_id: string | null }>(sql`
    select ur.role as kind, ur.box_id::text as box_id
      from public.user_roles ur
      where ur.user_id = ${authUserId}::uuid
        and ur.role in ('box_admin', 'coach', 'super_admin')
    union all
    select 'owner' as kind, b.id::text as box_id
      from public.boxes b
      where b.owner_user_id = ${authUserId}::uuid
    union all
    select 'coach_row' as kind, c.box_id::text as box_id
      from public.coaches c
      where c.user_id = ${authUserId}::uuid and c.removed_at is null
  `);

  const manage = new Set<string>();
  const coach = new Set<string>();
  let hasSuperRole = false;
  for (const r of rows.rows) {
    if (r.kind === "super_admin") hasSuperRole = true;
    else if ((r.kind === "box_admin" || r.kind === "owner") && r.box_id) manage.add(r.box_id);
    else if ((r.kind === "coach" || r.kind === "coach_row") && r.box_id) coach.add(r.box_id);
  }
  const isSuper = hasSuperRole && (await isSuperAdminAuthorized(callerAal));
  return {
    allowed: isSuper || manage.size > 0 || coach.size > 0,
    manageBoxIds: [...manage].sort(),
    coachBoxIds: [...coach].sort(),
    isSuper,
  };
}

/** Box al que queda atado un token nuevo; null = plataforma (super admin). */
export function boxForNewToken(access: PanelAccess, requestedBoxId?: string | null): string | null {
  const all = [...access.manageBoxIds, ...access.coachBoxIds];
  if (requestedBoxId && (access.isSuper || all.includes(requestedBoxId))) return requestedBoxId;
  if (access.isSuper) return null;
  return all[0] ?? null;
}

export type AdminAccess = {
  /** wodplace_users.id que firmó el token (y dueño de la sesión verificada). */
  userId: string;
  authUserId: string;
  claims: AdminTokenClaims;
  panel: PanelAccess;
};

/** ¿Puede esta persona administrar (moderar/gestionar) `boxId`? */
export function canManageBox(a: AdminAccess, boxId: string): boolean {
  if (a.panel.isSuper) return !a.claims.boxId || a.claims.boxId === boxId;
  return a.panel.manageBoxIds.includes(boxId) && a.claims.boxId === boxId;
}

/**
 * F2 (2026-10-25): moderación SIN token ni PIN. Quién llama sale SOLO de la sesión de Supabase verificada;
 * el rol y el box se deciden en cada petición con resolvePanelAccess (rol vigente de la base, aal de ESTA
 * sesión). La cabecera X-Admin-Session ya no se mira aquí: no concede nada.
 */
export type SessionCaller = { userId: string; authUserId: string; aal: string | null };

/**
 * La cuenta que llama, o responde 401/403/404 y devuelve null. Si el cliente declara un `userId` (rutas
 * antiguas lo mandan en la query), se exige que sea la cuenta dueña de la sesión (assertOwnsAccount); si no lo
 * declara, se resuelve desde la sesión.
 */
export async function resolveSessionCaller(
  req: Request,
  res: Response,
  claimedUserId?: string,
): Promise<SessionCaller | null> {
  if (claimedUserId) {
    if (!(await assertOwnsAccount(req, res, claimedUserId))) return null;
  }
  const sb = await resolveSupabaseUser(req);
  if (!sb) {
    res.status(401).json({ error: "Missing or invalid Authorization token" });
    return null;
  }
  if (claimedUserId) return { userId: claimedUserId, authUserId: sb.id, aal: sb.aal };
  const [row] = await db
    .select({ id: wodplaceUsersTable.id })
    .from(wodplaceUsersTable)
    .where(eq(wodplaceUsersTable.authUserId, sb.id));
  if (!row) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return { userId: row.id, authUserId: sb.id, aal: sb.aal };
}

/**
 * ¿Puede esta cuenta moderar contenido de `boxId`? Administrador o dueño de ESE box, o super admin autorizado
 * (aal2 si el interruptor está encendido). Un coach no modera. El box es el del contenido, nunca uno que mande
 * el cliente.
 */
export async function canModerateBox(caller: SessionCaller, boxId: string | null | undefined): Promise<boolean> {
  if (!boxId) return false;
  const panel = await resolvePanelAccess(caller.authUserId, caller.aal);
  return panel.isSuper || panel.manageBoxIds.includes(boxId);
}

/** Boxes que puede administrar (null = todos, solo super admin). */
export function manageScope(a: AdminAccess): string[] | null {
  if (a.panel.isSuper) return a.claims.boxId ? [a.claims.boxId] : null;
  return a.panel.manageBoxIds.filter((b) => b === a.claims.boxId);
}

export const ADMIN_SESSION_HEADER = "x-admin-session";

/**
 * Resuelve el acceso de administrador de una petición, o responde 401/403 y
 * devuelve null. Exige las TRES cosas: (1) sesión de Supabase verificada en
 * `Authorization`, (2) token de administrador válido en `X-Admin-Session`
 * firmado para ESA misma cuenta, (3) un rol de panel vigente.
 * `need: "manage"` pide además administrar al menos un box (un coach puro no).
 */
export async function resolveAdminAccess(
  req: Request,
  res: Response,
  need: "staff" | "manage",
): Promise<AdminAccess | null> {
  const sb = await resolveSupabaseUser(req);
  if (!sb) {
    res.status(401).json({ error: "Missing or invalid Authorization token" });
    return null;
  }
  const claims = verifyAdminToken(req.header(ADMIN_SESSION_HEADER));
  if (!claims) {
    res.status(401).json({ error: "Invalid or expired admin session" });
    return null;
  }
  const authUserId = await authUserIdForWodplaceUser(claims.userId);
  if (!authUserId || authUserId !== sb.id) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  const panel = await resolvePanelAccess(sb.id, sb.aal);
  const effectiveManage = panel.isSuper || panel.manageBoxIds.length > 0;
  if (!panel.allowed || (need === "manage" && !effectiveManage)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return { userId: claims.userId, authUserId, claims, panel };
}

/** Middleware para rutas /admin/*; deja el acceso en res.locals.adminAccess. */
export function requireAdminAccess(need: "staff" | "manage") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const access = await resolveAdminAccess(req, res, need);
      if (!access) return;
      res.locals.adminAccess = access;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function adminAccessOf(res: Response): AdminAccess {
  return res.locals.adminAccess as AdminAccess;
}

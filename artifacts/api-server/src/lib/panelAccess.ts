import { db, wodplaceUsersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { Request, Response } from "express";

import { isSuperAdminAuthorized } from "./aal2Enforcement";
import { assertOwnsAccount, resolveSupabaseUser } from "./supabaseAuth";

/**
 * Quién es administrador de qué box se decide SOLO aquí, por la sesión de Supabase VERIFICADA de la petición y el
 * rol vigente en la base (F2, 2026-10-25; F7-b1 quitó el token de administrador y el PIN del servidor):
 *
 *  - roles que dan acceso a un panel (los mismos que muestran el ítem "Administrador"/"Coach" en la app):
 *    box_admin, coach y super_admin;
 *  - dueño del box (boxes.owner_user_id) cuenta como box_admin de ese box;
 *  - super_admin solo vale si isSuperAdminAuthorized(aal) lo permite (aal2 cuando el interruptor está
 *    encendido) -- el aal sale de la sesión de Supabase VERIFICADA de esta misma petición.
 *
 * El rol se vuelve a leer en cada petición: quitar un rol corta el acceso de inmediato.
 */

export type PanelAccess = {
  /** ¿Tiene acceso a algún panel (cualquier rol de panel)? */
  allowed: boolean;
  /** Boxes donde administra (box_admin o dueño). */
  manageBoxIds: string[];
  /** Boxes donde es coach. */
  coachBoxIds: string[];
  /** Super admin ya autorizado (aal2 si corresponde). */
  isSuper: boolean;
};

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

/**
 * F2 (2026-10-25): moderación SIN token ni PIN. Quién llama sale SOLO de la sesión de Supabase verificada;
 * el rol y el box se deciden en cada petición con resolvePanelAccess (rol vigente de la base, aal de ESTA
 * sesión). No existe ningún token de administrador: la sesión, el rol y el box lo deciden todo.
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

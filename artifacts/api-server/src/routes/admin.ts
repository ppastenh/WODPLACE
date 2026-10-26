import { CreateAdminDashLinkBody, CreateAdminDashLinkResponse } from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";

import { resolvePanelAccess } from "../lib/adminAccess";
import { getDashboardUrl, getSuperAdminUrl, getSupabaseAdmin } from "../lib/supabaseAdmin";
import { resolveSupabaseUser } from "../lib/supabaseAuth";

const router: IRouter = Router();

// F2b (2026-10-25): el enlace de acceso automático al panel se decide SOLO por la sesión verificada y el rol vigente
// de la base. Ya no usa el token de administrador ni el puente por correo entre wodplace_users y profiles: el enlace
// se genera para la propia cuenta de la sesión (su correo verificado por Supabase), nunca para un correo que mande
// la app. Reversa: revertir el commit (no hay migración).
const DASH_LINK_MAX = 10;
const DASH_LINK_WINDOW_MS = 10 * 60 * 1000;
const dashLinkHits = new Map<string, number[]>();

/** Límite por cuenta (memoria del proceso): máximo DASH_LINK_MAX peticiones cada DASH_LINK_WINDOW_MS. */
function dashLinkAllowed(key: string): boolean {
  const now = Date.now();
  const hits = (dashLinkHits.get(key) ?? []).filter((t) => now - t < DASH_LINK_WINDOW_MS);
  if (hits.length >= DASH_LINK_MAX) {
    dashLinkHits.set(key, hits);
    return false;
  }
  hits.push(now);
  dashLinkHits.set(key, hits);
  if (dashLinkHits.size > 5000) {
    for (const [k, v] of dashLinkHits) if (v.every((t) => now - t >= DASH_LINK_WINDOW_MS)) dashLinkHits.delete(k);
  }
  return true;
}

/**
 * POST /admin/dash-link  { target?: 'box' | 'super', boxId?: string }
 *
 * Mints a single-use Supabase magic link that logs the caller's own account
 * straight into the requested panel (box-admin by default, or the
 * super-admin-hub when target: "super"), so the mobile app's WebView never
 * shows a second login.
 *
 * Requires only the verified Supabase session (Authorization). Authorization:
 *  - target "box": the caller must administer (box_admin or owner) or coach at
 *    least one box -- or, when `boxId` is sent, THAT box -- or be an authorized
 *    super admin (aal2 when the switch is on);
 *  - target "super": authorized super admin only.
 * Otherwise 403. No session: 401. Too many requests: 429. 409 when the session
 * account has no email to sign in with.
 */
router.post("/admin/dash-link", async (req: Request, res: Response) => {
  const sb = await resolveSupabaseUser(req);
  if (!sb) {
    res.status(401).json({ error: "Missing or invalid Authorization token" });
    return;
  }
  if (!dashLinkAllowed(sb.id)) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  const parsed = CreateAdminDashLinkBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { target } = parsed.data;
  const requestedBoxId = typeof req.body?.boxId === "string" && req.body.boxId ? (req.body.boxId as string) : null;

  try {
    const panel = await resolvePanelAccess(sb.id, sb.aal);
    let allowed: boolean;
    if (target === "super") allowed = panel.isSuper;
    else if (requestedBoxId) {
      allowed = panel.isSuper || panel.manageBoxIds.includes(requestedBoxId) || panel.coachBoxIds.includes(requestedBoxId);
    } else allowed = panel.allowed;
    if (!allowed) {
      req.log.warn({ authUserId: sb.id, target }, "[dash-link] 403: this session has no panel access for that target");
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!sb.email) {
      res.status(409).json({ error: "No linked dashboard account for this identity" });
      return;
    }

    const redirectTo = `${target === "super" ? getSuperAdminUrl() : getDashboardUrl()}/`;
    const { data, error } = await getSupabaseAdmin().auth.admin.generateLink({
      type: "magiclink",
      email: sb.email,
      options: { redirectTo },
    });

    const url = data?.properties?.action_link;
    if (error || !url) {
      req.log.error({ err: error, redirectTo }, "[dash-link] 502: Supabase generateLink failed for dash auto-login");
      res.status(502).json({ error: "Could not create dashboard link" });
      return;
    }

    // NB: never log the `url` (one-time credential) nor the email.
    req.log.info({ authUserId: sb.id, target }, "[dash-link] 200: magic link minted for dash auto-login");
    res.json(CreateAdminDashLinkResponse.parse({ url }));
  } catch (error) {
    req.log.error({ err: error }, "Error creating admin dashboard link");
    res.status(500).json({ error: "Failed to create dashboard link" });
  }
});

export default router;

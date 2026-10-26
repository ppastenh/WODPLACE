import {
  AckContractAcceptancesResponse,
  CreateAdminDashLinkBody,
  CreateAdminDashLinkResponse,
  CreateAdminSessionBody,
  CreateAdminSessionResponse,
  GetAdminPinStatusBody,
  GetAdminPinStatusResponse,
  ListAdminContractAcceptancesResponse,
  SetupAdminPinBody,
  SetupAdminPinResponse,
  VerifyAdminPinBody,
  VerifyAdminPinResponse,
  type AckContractAcceptancesResult,
  type ContractAcceptanceNotification,
} from "@workspace/api-zod";
import {
  adminPinsTable,
  contractAcceptancesTable,
  db,
  wodplaceUsersTable,
} from "@workspace/db";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

import {
  adminAccessOf,
  boxForNewToken,
  manageScope,
  requireAdminAccess,
  resolvePanelAccess,
  type PanelAccess,
} from "../lib/adminAccess";
import { signAdminToken } from "../lib/adminToken";
import { hashPin, verifyPin } from "../lib/pinHash";
import { getDashboardUrl, getSuperAdminUrl, getSupabaseAdmin } from "../lib/supabaseAdmin";
import { assertOwnsAccount, resolveSupabaseUser } from "../lib/supabaseAuth";

const router: IRouter = Router();

/**
 * Incidente 2026-10-22: setup/verify/session entregaban un token de
 * administrador a CUALQUIER cuenta con sesión. Ahora, después de comprobar que
 * la cuenta es la dueña de la sesión (assertOwnsAccount), exigen que tenga un
 * rol que dé acceso a un panel (box_admin, coach, dueño de un box, o super
 * admin autorizado por aal2). Quien no lo tiene recibe 403 sin tocar el PIN.
 */
async function requirePanelRole(req: Request, res: Response): Promise<PanelAccess | null> {
  const sb = await resolveSupabaseUser(req);
  if (!sb) {
    res.status(401).json({ error: "Missing or invalid Authorization token" });
    return null;
  }
  const panel = await resolvePanelAccess(sb.id, sb.aal);
  if (!panel.allowed) {
    res.status(403).json({ error: "Esta cuenta no tiene acceso a un panel de administración." });
    return null;
  }
  return panel;
}

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_MS = 15 * 60 * 1000;

function activeLockIso(lockedUntil: Date | null): string | null {
  return lockedUntil && lockedUntil.getTime() > Date.now()
    ? lockedUntil.toISOString()
    : null;
}

/**
 * POST /admin/pin/status
 *
 * Lets the app choose between the create-PIN, enter-PIN and locked flows.
 */
router.post("/admin/pin/status", async (req: Request, res: Response) => {
  const parsed = GetAdminPinStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;

  try {
    const [row] = await db
      .select()
      .from(adminPinsTable)
      .where(eq(adminPinsTable.userId, parsed.data.userId));

    res.json(
      GetAdminPinStatusResponse.parse({
        hasPin: !!row,
        failedAttempts: row?.failedAttempts ?? 0,
        lockedUntil: row ? activeLockIso(row.lockedUntil) : null,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error reading admin PIN status");
    res.status(500).json({ error: "Failed to read PIN status" });
  }
});

/**
 * POST /admin/pin/setup
 *
 * First-time PIN, or a new PIN after "I forgot my PIN" (the app has already
 * re-verified the account password client-side). Clears attempts + lockout
 * and returns a fresh admin session token.
 *
 * Fase 4: this used to be the root-of-trust bypass for the whole admin
 * session system — it minted a valid admin token for ANY userId the caller
 * claimed, with no server-side proof of ownership (the client-side password
 * re-verify mentioned above was never checked here). assertOwnsAccount now
 * requires this account's own Supabase JWT once it's migrated, closing that
 * hole the same way as every other athlete-facing endpoint.
 */
router.post("/admin/pin/setup", async (req: Request, res: Response) => {
  const parsed = SetupAdminPinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;
  const panel = await requirePanelRole(req, res);
  if (!panel) return;

  const { userId, pin } = parsed.data;
  try {
    const pinHash = hashPin(pin);
    await db
      .insert(adminPinsTable)
      .values({ userId, pinHash })
      .onConflictDoUpdate({
        target: adminPinsTable.userId,
        set: {
          pinHash,
          failedAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        },
      });

    res.json(
      SetupAdminPinResponse.parse({ ok: true, token: signAdminToken(userId, boxForNewToken(panel)) }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error setting up admin PIN");
    res.status(500).json({ error: "Failed to set up PIN" });
  }
});

/**
 * POST /admin/pin/verify
 *
 * 5 consecutive wrong PINs => 15-minute lockout, enforced here (not on the
 * client). On success returns an admin session token and resets the counter.
 */
router.post("/admin/pin/verify", async (req: Request, res: Response) => {
  const parsed = VerifyAdminPinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;
  const panel = await requirePanelRole(req, res);
  if (!panel) return;

  const { userId, pin } = parsed.data;
  try {
    const [row] = await db
      .select()
      .from(adminPinsTable)
      .where(eq(adminPinsTable.userId, userId));

    if (!row) {
      res.json(
        VerifyAdminPinResponse.parse({
          ok: false,
          token: null,
          remainingAttempts: MAX_PIN_ATTEMPTS,
          lockedUntil: null,
        }),
      );
      return;
    }

    if (row.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
      res.json(
        VerifyAdminPinResponse.parse({
          ok: false,
          token: null,
          remainingAttempts: 0,
          lockedUntil: row.lockedUntil.toISOString(),
        }),
      );
      return;
    }

    if (verifyPin(pin, row.pinHash)) {
      await db
        .update(adminPinsTable)
        .set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
        .where(eq(adminPinsTable.userId, userId));

      res.json(
        VerifyAdminPinResponse.parse({
          ok: true,
          token: signAdminToken(userId, boxForNewToken(panel)),
          remainingAttempts: MAX_PIN_ATTEMPTS,
          lockedUntil: null,
        }),
      );
      return;
    }

    const failedAttempts = row.failedAttempts + 1;
    const locked = failedAttempts >= MAX_PIN_ATTEMPTS;
    const lockedUntil = locked ? new Date(Date.now() + PIN_LOCK_MS) : null;

    await db
      .update(adminPinsTable)
      .set({ failedAttempts, lockedUntil, updatedAt: new Date() })
      .where(eq(adminPinsTable.userId, userId));

    res.json(
      VerifyAdminPinResponse.parse({
        ok: false,
        token: null,
        remainingAttempts: Math.max(0, MAX_PIN_ATTEMPTS - failedAttempts),
        lockedUntil: lockedUntil ? lockedUntil.toISOString() : null,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error verifying admin PIN");
    res.status(500).json({ error: "Failed to verify PIN" });
  }
});

/**
 * POST /admin/pin/session
 *
 * Issues a session with no PIN — after a device biometric check, or after
 * re-entering the account password while the PIN is locked. Clears the
 * lockout. Requires an existing PIN (first-time setup must use /setup).
 *
 * Fase 4: same root-of-trust bypass as /setup above — this issued a valid
 * admin token for any userId with a PIN row, with zero server-side proof
 * (the biometric/password check was entirely client-side). Now requires
 * this account's own Supabase JWT once migrated.
 */
router.post("/admin/pin/session", async (req: Request, res: Response) => {
  const parsed = CreateAdminSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;
  const panel = await requirePanelRole(req, res);
  if (!panel) return;

  const { userId } = parsed.data;
  try {
    const [row] = await db
      .select()
      .from(adminPinsTable)
      .where(eq(adminPinsTable.userId, userId));

    if (!row) {
      res.status(404).json({ error: "No admin PIN set for this account" });
      return;
    }

    await db
      .update(adminPinsTable)
      .set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(adminPinsTable.userId, userId));

    res.json(
      CreateAdminSessionResponse.parse({
        ok: true,
        token: signAdminToken(userId, boxForNewToken(panel)),
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error creating admin session");
    res.status(500).json({ error: "Failed to create admin session" });
  }
});

/**
 * GET /admin/contracts and PUT /admin/contracts/:slug used to live here —
 * removed in Fase B/B1 (no real caller in box-admin, wodplace, or any
 * script: box-admin's own "Contratos"/"Archivos" screen writes directly
 * via the Supabase client, through replace_contract_document()/
 * delete_contract_document(), see supabase/migrations/
 * 20261012130000_contracts_owner_only_versioned.sql). Keeping them would
 * have meant a second, PIN-session write path with no real session to
 * check real ownership against — simulating one just to reuse the RPC
 * was more complexity than a genuinely dead endpoint is worth.
 */

/**
 * GET /admin/contract-acceptances
 *
 * Lists every recorded contract acceptance (newest first) with the owning
 * member's name/email, plus whether the owner has viewed it yet. Drives the
 * admin panel's "new acceptance" notification badge/counter.
 */
router.get(
  "/admin/contract-acceptances",
  requireAdminAccess("manage"),
  async (req: Request, res: Response) => {
    // Cada administrador ve SOLO los contratos de su box (null = super admin, todos).
    const scope = manageScope(adminAccessOf(res));
    if (scope && scope.length === 0) {
      res.json(ListAdminContractAcceptancesResponse.parse([]));
      return;
    }
    try {
      const rows = await db
        .select({
          userId: contractAcceptancesTable.userId,
          name: wodplaceUsersTable.name,
          email: wodplaceUsersTable.email,
          emergencyContactName: contractAcceptancesTable.emergencyContactName,
          emergencyContactPhone:
            contractAcceptancesTable.emergencyContactPhone,
          acceptedAt: contractAcceptancesTable.acceptedAt,
          guardianName: contractAcceptancesTable.guardianName,
          guardianRelationship: contractAcceptancesTable.guardianRelationship,
          seenByOwnerAt: contractAcceptancesTable.seenByOwnerAt,
        })
        .from(contractAcceptancesTable)
        .innerJoin(
          wodplaceUsersTable,
          eq(contractAcceptancesTable.userId, wodplaceUsersTable.id),
        )
        .where(scope ? inArray(contractAcceptancesTable.boxId, scope) : undefined)
        .orderBy(desc(contractAcceptancesTable.acceptedAt));

      const result: ContractAcceptanceNotification[] = rows.map((row) => ({
        userId: row.userId,
        name: row.name,
        email: row.email,
        emergencyContactName: row.emergencyContactName,
        emergencyContactPhone: row.emergencyContactPhone,
        acceptedAt: row.acceptedAt.toISOString(),
        guardianName: row.guardianName,
        guardianRelationship: row.guardianRelationship,
        seen: row.seenByOwnerAt !== null,
      }));

      res.json(ListAdminContractAcceptancesResponse.parse(result));
    } catch (error) {
      req.log.error({ err: error }, "Error listing contract acceptances");
      res.status(500).json({ error: "Failed to list contract acceptances" });
    }
  },
);

/**
 * POST /admin/contract-acceptances/ack
 *
 * Marks every unseen contract acceptance as seen by the owner, clearing the
 * notification badge/counter in the admin panel.
 */
router.post(
  "/admin/contract-acceptances/ack",
  requireAdminAccess("manage"),
  async (req: Request, res: Response) => {
    const scope = manageScope(adminAccessOf(res));
    if (scope && scope.length === 0) {
      res.json(AckContractAcceptancesResponse.parse({ acknowledged: 0 }));
      return;
    }
    try {
      const rows = await db
        .update(contractAcceptancesTable)
        .set({ seenByOwnerAt: new Date() })
        .where(
          and(
            isNull(contractAcceptancesTable.seenByOwnerAt),
            scope ? inArray(contractAcceptancesTable.boxId, scope) : undefined,
          ),
        )
        .returning({ userId: contractAcceptancesTable.userId });

      const result: AckContractAcceptancesResult = {
        acknowledged: rows.length,
      };
      res.json(AckContractAcceptancesResponse.parse(result));
    } catch (error) {
      req.log.error({ err: error }, "Error acknowledging contract acceptances");
      res
        .status(500)
        .json({ error: "Failed to acknowledge contract acceptances" });
    }
  },
);

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

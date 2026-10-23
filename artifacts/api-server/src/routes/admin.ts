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

import { findDistinctAdminEmails, resolveAdminRoles } from "../lib/adminRole";
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

/**
 * Resolves the Supabase Auth email to auto-login into the box dashboard for
 * the PIN identity `pinUserId` (a `wodplace_users.id` — the app's local mock
 * id, NOT an `auth.users.id`).
 *
 * A PIN identity is a non-UUID mock id, so it can't be matched against
 * `boxes.owner_user_id` (a real `auth.users.id` — that comparison actually
 * errors once the column is `uuid`). The only bridge is the shared email:
 * match `wodplace_users.email` against a `profiles` row that also carries a
 * `box_admin` / `super_admin` role. Exactly one distinct account -> use it;
 * ambiguous or missing -> null, and the caller falls back to the dashboard's
 * normal email/password login.
 */
async function resolveDashLoginEmail(
  pinUserId: string,
  log: Request["log"],
): Promise<string | null> {
  const [appUser] = await db
    .select({ email: wodplaceUsersTable.email })
    .from(wodplaceUsersTable)
    .where(eq(wodplaceUsersTable.id, pinUserId));
  if (!appUser?.email) {
    log.warn(
      { pinUserId },
      "[dash-link] no wodplace_users row/email for this PIN identity",
    );
    return null;
  }

  const matches = await findDistinctAdminEmails(appUser.email);
  if (matches.length !== 1) {
    log.warn(
      { pinUserId, email: appUser.email, matchCount: matches.length },
      "[dash-link] wodplace_users email did not resolve to exactly one box_admin/super_admin profile",
    );
    return null;
  }
  log.info(
    { pinUserId, via: "wodplace_users-email-match" },
    "[dash-link] resolved dashboard login email via email match",
  );
  return matches[0];
}

/**
 * POST /admin/dash-link  { target?: 'box' | 'super' }
 *
 * Mints a single-use Supabase magic link that logs the caller's admin
 * account straight into the requested panel (box-admin by default, or the
 * super-admin-hub when target: "super"), so the mobile app's WebView never
 * shows a second login. Requires a valid admin session token. Returns 409
 * when no linked Supabase admin account can be resolved, or 403 when
 * target: "super" is requested by an account without the super_admin
 * role — the app then falls back accordingly.
 */
router.post(
  "/admin/dash-link",
  requireAdminAccess("staff"),
  async (req: Request, res: Response) => {
    const parsed = CreateAdminDashLinkBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const { target } = parsed.data;

    try {
      const pinUserId = adminAccessOf(res).userId;
      if (!pinUserId) {
        res.status(401).json({ error: "Invalid or expired admin session" });
        return;
      }

      const email = await resolveDashLoginEmail(pinUserId, req.log);
      if (!email) {
        req.log.warn(
          { pinUserId },
          "[dash-link] 409: no linked dashboard account, app will fall back to manual login",
        );
        res
          .status(409)
          .json({ error: "No linked dashboard account for this identity" });
        return;
      }

      if (target === "super") {
        const roles = await resolveAdminRoles(email);
        if (!roles.includes("super_admin")) {
          req.log.warn(
            { pinUserId, email },
            "[dash-link] 403: super-admin-hub link requested by a non-super_admin account",
          );
          res.status(403).json({ error: "This account does not have the super_admin role" });
          return;
        }
      }

      const redirectTo = `${target === "super" ? getSuperAdminUrl() : getDashboardUrl()}/`;
      const { data, error } = await getSupabaseAdmin().auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });

      const url = data?.properties?.action_link;
      if (error || !url) {
        req.log.error(
          { err: error, redirectTo },
          "[dash-link] 502: Supabase generateLink failed for dash auto-login",
        );
        res.status(502).json({ error: "Could not create dashboard link" });
        return;
      }

      // Diagnostics: log the link's shape (origin + path + the redirect_to it
      // actually carries) WITHOUT the one-time token in the query string.
      let linkShape = "<unparseable>";
      try {
        const u = new URL(url);
        linkShape = `${u.origin}${u.pathname} redirect_to=${u.searchParams.get("redirect_to")}`;
      } catch {
        /* keep placeholder */
      }
      req.log.info(
        {
          pinUserId,
          target,
          requestedRedirectTo: redirectTo,
          linkShape,
          propertyKeys: data?.properties
            ? Object.keys(data.properties)
            : null,
        },
        "[dash-link] 200: magic link minted for dash auto-login",
      );
      // NB: never log the full `url` — it is a one-time credential.
      res.json(CreateAdminDashLinkResponse.parse({ url }));
    } catch (error) {
      req.log.error({ err: error }, "Error creating admin dashboard link");
      res.status(500).json({ error: "Failed to create dashboard link" });
    }
  },
);

export default router;

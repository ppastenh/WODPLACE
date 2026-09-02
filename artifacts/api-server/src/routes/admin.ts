import {
  AckContractAcceptancesResponse,
  CreateAdminDashLinkResponse,
  CreateAdminSessionBody,
  CreateAdminSessionResponse,
  GetAdminPinStatusBody,
  GetAdminPinStatusResponse,
  ListAdminContractAcceptancesResponse,
  ListAdminContractsResponse,
  SetupAdminPinBody,
  SetupAdminPinResponse,
  UpdateAdminContractBody,
  UpdateAdminContractResponse,
  VerifyAdminPinBody,
  VerifyAdminPinResponse,
  type AckContractAcceptancesResult,
  type ContractAcceptanceNotification,
} from "@workspace/api-zod";
import {
  adminPinsTable,
  contractAcceptancesTable,
  contractDocumentsTable,
  db,
  wodplaceUsersTable,
} from "@workspace/db";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

import { getAdminSession, requireAdminSession } from "../lib/adminAuth";
import { signAdminToken } from "../lib/adminToken";
import { resolveBoxId } from "../lib/boxContext";
import { ensureDefaultDocuments } from "../lib/contractDocuments";
import { hashPin, verifyPin } from "../lib/pinHash";
import { getDashboardUrl, getSupabaseAdmin } from "../lib/supabaseAdmin";

const router: IRouter = Router();

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
 */
router.post("/admin/pin/setup", async (req: Request, res: Response) => {
  const parsed = SetupAdminPinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

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
      SetupAdminPinResponse.parse({ ok: true, token: signAdminToken(userId) }),
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
          token: signAdminToken(userId),
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
 */
router.post("/admin/pin/session", async (req: Request, res: Response) => {
  const parsed = CreateAdminSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

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
        token: signAdminToken(userId),
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error creating admin session");
    res.status(500).json({ error: "Failed to create admin session" });
  }
});

/**
 * GET /admin/contracts
 *
 * Lists contract documents for the admin panel (current title + whether a
 * PDF has been uploaded yet).
 */
router.get(
  "/admin/contracts",
  requireAdminSession,
  async (req: Request, res: Response) => {
    try {
      const boxId = await resolveBoxId(getAdminSession(req)?.userId);
      await ensureDefaultDocuments(boxId);
      const documents = await db
        .select()
        .from(contractDocumentsTable)
        .where(eq(contractDocumentsTable.boxId, boxId));
      res.json(
        ListAdminContractsResponse.parse(
          documents.map((doc) => ({
            slug: doc.slug,
            title: doc.title,
            objectPath: doc.objectPath,
            read: false,
            readAt: null,
          })),
        ),
      );
    } catch (error) {
      req.log.error({ err: error }, "Error listing admin contracts");
      res.status(500).json({ error: "Failed to list contracts" });
    }
  },
);

/**
 * PUT /admin/contracts/:slug
 *
 * Attaches a newly uploaded PDF (objectPath from the storage upload flow) to
 * a contract document slug, optionally updating its title.
 */
router.put(
  "/admin/contracts/:slug",
  requireAdminSession,
  async (req: Request, res: Response) => {
    const parsed = UpdateAdminContractBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    try {
      const slug = String(req.params.slug);
      const { objectPath, title } = parsed.data;
      const boxId = await resolveBoxId(getAdminSession(req)?.userId);

      const [existing] = await db
        .select()
        .from(contractDocumentsTable)
        .where(eq(contractDocumentsTable.slug, slug));

      if (!existing && !title) {
        res
          .status(400)
          .json({ error: "title is required when creating a new document" });
        return;
      }

      const updatedAt = new Date();
      const [row] = await db
        .insert(contractDocumentsTable)
        .values({
          slug,
          boxId,
          title: title ?? existing?.title ?? slug,
          objectPath,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: contractDocumentsTable.slug,
          set: {
            objectPath,
            updatedAt,
            ...(title ? { title } : {}),
          },
        })
        .returning();

      res.json(
        UpdateAdminContractResponse.parse({
          slug: row.slug,
          title: row.title,
          objectPath: row.objectPath,
          read: false,
          readAt: null,
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Error updating contract document");
      res.status(500).json({ error: "Failed to update document" });
    }
  },
);

/**
 * GET /admin/contract-acceptances
 *
 * Lists every recorded contract acceptance (newest first) with the owning
 * member's name/email, plus whether the owner has viewed it yet. Drives the
 * admin panel's "new acceptance" notification badge/counter.
 */
router.get(
  "/admin/contract-acceptances",
  requireAdminSession,
  async (req: Request, res: Response) => {
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
  requireAdminSession,
  async (req: Request, res: Response) => {
    try {
      const rows = await db
        .update(contractAcceptancesTable)
        .set({ seenByOwnerAt: new Date() })
        .where(isNull(contractAcceptancesTable.seenByOwnerAt))
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

  const matches = await db.execute<{ email: string }>(sql`
    SELECT DISTINCT p.email
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE lower(p.email) = lower(${appUser.email})
      AND p.email IS NOT NULL
      AND ur.role IN ('box_admin', 'super_admin')
    LIMIT 2
  `);
  if (matches.rows.length !== 1) {
    log.warn(
      { pinUserId, email: appUser.email, matchCount: matches.rows.length },
      "[dash-link] wodplace_users email did not resolve to exactly one box_admin/super_admin profile",
    );
    return null;
  }
  log.info(
    { pinUserId, via: "wodplace_users-email-match" },
    "[dash-link] resolved dashboard login email via email match",
  );
  return matches.rows[0].email;
}

/**
 * POST /admin/dash-link
 *
 * Mints a single-use Supabase magic link that logs the caller's box-admin
 * account straight into the dashboard, so the mobile app's WebView never
 * shows a second login. Requires a valid admin session token. Returns 409
 * when no linked Supabase admin account can be resolved — the app then loads
 * the dashboard's normal login instead.
 */
router.post(
  "/admin/dash-link",
  requireAdminSession,
  async (req: Request, res: Response) => {
    try {
      const pinUserId = getAdminSession(req)?.userId;
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

      const redirectTo = `${getDashboardUrl()}/`;
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

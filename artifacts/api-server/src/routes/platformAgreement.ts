import {
  contractDocumentsTable,
  db,
  platformAgreementAcceptancesTable,
  wodplaceUsersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

import { resolveAdminRoles, type AdminRole } from "../lib/adminRole";
import { resolveBoxId } from "../lib/boxContext";
import { ensureDefaultPlatformDocument, PLATFORM_AGREEMENT_DOCUMENT } from "../lib/contractDocuments";

const router: IRouter = Router();

interface PlatformAgreementStatus {
  roles: AdminRole[];
  accepted: boolean;
  document: { slug: string; title: string; objectPath: string | null } | null;
}

/**
 * Resolves everything the app needs to decide what to show in place of the
 * "Administrador" nav item for `userId`: every real admin role this account
 * holds (via the email bridge — see lib/adminRole.ts; an account can hold
 * both box_admin and super_admin, e.g. the platform owner in her own box)
 * and whether the platform agreement is satisfied. super_admin is exempt
 * outright — they're the other party to the agreement (WODPLACE itself),
 * not someone who accepts it.
 */
async function loadStatus(userId: string): Promise<PlatformAgreementStatus> {
  const [appUser] = await db
    .select({ email: wodplaceUsersTable.email })
    .from(wodplaceUsersTable)
    .where(eq(wodplaceUsersTable.id, userId));

  const roles = appUser ? await resolveAdminRoles(appUser.email) : [];
  if (roles.length === 0) {
    return { roles: [], accepted: false, document: null };
  }

  const boxId = await resolveBoxId();
  await ensureDefaultPlatformDocument(boxId);
  const [doc] = await db
    .select({
      slug: contractDocumentsTable.slug,
      title: contractDocumentsTable.title,
      objectPath: contractDocumentsTable.objectPath,
    })
    .from(contractDocumentsTable)
    .where(eq(contractDocumentsTable.slug, PLATFORM_AGREEMENT_DOCUMENT.slug));
  const document = doc ?? null;

  if (roles.includes("super_admin")) {
    return { roles, accepted: true, document };
  }

  const [acceptance] = await db
    .select()
    .from(platformAgreementAcceptancesTable)
    .where(eq(platformAgreementAcceptancesTable.userId, userId));

  return { roles, accepted: !!acceptance, document };
}

/**
 * GET /platform-agreement?userId=...
 *
 * Drives the "Administrador" nav item: no roles -> hide it entirely,
 * box_admin without acceptance -> show "Acuerdo de Plataforma" instead,
 * anything else -> show "Administrador" as normal (offering a panel picker
 * client-side when roles has more than one entry).
 */
router.get("/platform-agreement", async (req: Request, res: Response) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  try {
    res.json(await loadStatus(userId));
  } catch (error) {
    req.log.error({ err: error }, "Error loading platform agreement status");
    res.status(500).json({ error: "Failed to load platform agreement status" });
  }
});

/**
 * POST /platform-agreement/accept  { userId }
 *
 * Re-verifies the role server-side rather than trusting the client — only a
 * box_admin has anything to accept here (super_admin is already exempt; a
 * non-admin has no business calling this at all).
 */
const AcceptBody = z.object({ userId: z.string().min(1) });

router.post("/platform-agreement/accept", async (req: Request, res: Response) => {
  const parsed = AcceptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { userId } = parsed.data;
    const [appUser] = await db
      .select({ email: wodplaceUsersTable.email })
      .from(wodplaceUsersTable)
      .where(eq(wodplaceUsersTable.id, userId));

    const roles = appUser ? await resolveAdminRoles(appUser.email) : [];
    if (roles.length === 0) {
      res.status(403).json({ error: "This account has no admin role to accept an agreement for" });
      return;
    }

    if (roles.includes("super_admin")) {
      res.json(await loadStatus(userId));
      return;
    }

    const boxId = await resolveBoxId();
    await ensureDefaultPlatformDocument(boxId);
    await db
      .insert(platformAgreementAcceptancesTable)
      .values({ userId, boxId, acceptedAt: new Date() })
      .onConflictDoUpdate({
        target: platformAgreementAcceptancesTable.userId,
        set: { acceptedAt: new Date(), boxId },
      });

    res.json(await loadStatus(userId));
  } catch (error) {
    req.log.error({ err: error }, "Error accepting platform agreement");
    res.status(500).json({ error: "Failed to accept platform agreement" });
  }
});

export default router;

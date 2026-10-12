import {
  AcceptContractsBody,
  AcceptContractsResponse,
  GetContractAcceptanceResponse,
  ListContractsResponse,
  MarkContractReadBody,
  MarkContractReadResponse,
  SetBirthdayConsentSelfBody,
  SetBirthdayConsentSelfResponse,
  GetContractSignedUrlResponse,
} from "@workspace/api-zod";
import {
  birthdayVisibilityConsentsTable,
  contractAcceptancesTable,
  contractDocumentsTable,
  contractDocumentVersionsTable,
  contractReadProgressTable,
  db,
  platformAgreementDocumentTable,
  wodplaceUsersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

import { resolveBoxIdForAthlete } from "../lib/boxContext";
import { isAnyStaff, isBoxOwnerOrSuperAdmin } from "../lib/boxOwnership";
import { sendContractAcceptanceEmail } from "../lib/ownerNotifications";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { assertOwnsAccount } from "../lib/supabaseAuth";

const CONTRACTS_BUCKET = "contracts";
const SIGNED_URL_TTL_SECONDS = 5 * 60;

const router: IRouter = Router();

/**
 * Slugs of this athlete's box's own athlete-facing documents that this
 * athlete has never read, or stopped having read after a contract
 * replacement cleared their contract_read_progress row for that slug (see
 * replace_contract_document(), requiresReacceptance=true). Empty for an
 * athlete with no box, or whose box has no documents of its own.
 */
export async function computePendingSlugs(userId: string): Promise<string[]> {
  const boxId = await resolveBoxIdForAthlete(userId);
  if (!boxId) return [];

  const documents = await db
    .select({ slug: contractDocumentsTable.slug })
    .from(contractDocumentsTable)
    .where(
      and(
        eq(contractDocumentsTable.boxId, boxId),
        eq(contractDocumentsTable.audience, "athlete"),
      ),
    );
  if (documents.length === 0) return [];

  const progress = await db
    .select({ documentSlug: contractReadProgressTable.documentSlug })
    .from(contractReadProgressTable)
    .where(
      and(
        eq(contractReadProgressTable.userId, userId),
        eq(contractReadProgressTable.boxId, boxId),
      ),
    );
  const readSlugs = new Set(progress.map((row) => row.documentSlug));
  return documents
    .map((doc) => doc.slug)
    .filter((slug) => !readSlugs.has(slug));
}

/**
 * GET /contracts?userId=...
 *
 * Lists the contract documents for the CALLER's OWN box (resolved via
 * box_members, never "the oldest box in the system" — see
 * resolveBoxIdForAthlete) annotated with whether that user has read each
 * one. A box with no contract documents of its own (or an athlete with no
 * box at all) simply gets an empty list — not another box's contracts.
 */
router.get("/contracts", async (req: Request, res: Response) => {
  const userId =
    typeof req.query.userId === "string" ? req.query.userId : undefined;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, userId))) return;

  try {
    const boxId = await resolveBoxIdForAthlete(userId);
    if (!boxId) {
      res.json(ListContractsResponse.parse([]));
      return;
    }

    const documents = await db
      .select()
      .from(contractDocumentsTable)
      .where(
        and(
          eq(contractDocumentsTable.boxId, boxId),
          eq(contractDocumentsTable.audience, "athlete"),
        ),
      );

    const progress = await db
      .select()
      .from(contractReadProgressTable)
      .where(
        and(
          eq(contractReadProgressTable.userId, userId),
          eq(contractReadProgressTable.boxId, boxId),
        ),
      );
    const progressBySlug = new Map(progress.map((row) => [row.documentSlug, row]));

    const result = documents.map((doc) => {
      const read = progressBySlug.get(doc.slug);
      return {
        slug: doc.slug,
        title: doc.title,
        objectPath: doc.objectPath,
        read: !!read,
        readAt: read?.readAt.toISOString() ?? null,
      };
    });

    res.json(ListContractsResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Error listing contracts");
    res.status(500).json({ error: "Failed to list contracts" });
  }
});

/**
 * POST /contracts/:slug/read
 *
 * Marks a contract document as read by a user (idempotent — re-reading just
 * refreshes the timestamp).
 */
router.post("/contracts/:slug/read", async (req: Request, res: Response) => {
  const parsed = MarkContractReadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  const { userId } = parsed.data;
  if (!(await assertOwnsAccount(req, res, userId))) return;
  try {
    const slug = String(req.params.slug);
    const boxId = await resolveBoxIdForAthlete(userId);
    if (!boxId) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const [document] = await db
      .select()
      .from(contractDocumentsTable)
      .where(
        and(
          eq(contractDocumentsTable.boxId, boxId),
          eq(contractDocumentsTable.slug, slug),
        ),
      );
    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const readAt = new Date();
    await db
      .insert(contractReadProgressTable)
      .values({
        userId,
        documentSlug: slug,
        readAt,
        boxId,
        documentVersionId: document.currentVersionId,
      })
      .onConflictDoUpdate({
        target: [
          contractReadProgressTable.userId,
          contractReadProgressTable.boxId,
          contractReadProgressTable.documentSlug,
        ],
        set: { readAt, documentVersionId: document.currentVersionId },
      });

    res.json(
      MarkContractReadResponse.parse({
        slug: document.slug,
        title: document.title,
        objectPath: document.objectPath,
        read: true,
        readAt: readAt.toISOString(),
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error marking contract as read");
    res.status(400).json({
      error:
        "Failed to mark document as read. Make sure the user has been synced first.",
    });
  }
});

type ResolvedContractFile = { objectPath: string; authorized: boolean };

/**
 * Resolves and authorizes a document purely from identifiers (box, slug,
 * optionally a specific version id) — the CALLER NEVER supplies a storage
 * path; every object_path signed below comes straight out of our own DB
 * row, found via a parameterized lookup. That's what keeps this immune to
 * path traversal (".."), another bucket, or another box's file: there's
 * no client-supplied path for such a thing to even appear in.
 *
 *   - No boxId -> the single global platform_agreement_document (slug must
 *     be "platform-agreement"); any staff role may open it.
 *   - boxId + slug, no versionId -> that box's CURRENT document; its own
 *     athletes may open it, plus the box's owner or a super_admin.
 *   - boxId + slug + versionId -> a specific (possibly archived) version;
 *     owner/super_admin only — an athlete's own view never needs one.
 *
 * Returns `authorized: false` (never a thrown/missing distinction) for
 * "doesn't exist" exactly like "exists but not yours", so the route's 404
 * never reveals which.
 */
async function resolveContractFile(
  userId: string,
  boxId: string | undefined,
  slug: string,
  versionId: string | undefined,
): Promise<ResolvedContractFile | null> {
  if (!boxId) {
    if (slug === "platform-agreement") {
      const [doc] = await db
        .select({ objectPath: platformAgreementDocumentTable.objectPath })
        .from(platformAgreementDocumentTable);
      if (!doc?.objectPath) return null;
      return { objectPath: doc.objectPath, authorized: await isAnyStaff(userId) };
    }
    // No boxId given for a non-platform slug: resolve the CALLER's own
    // box — an athlete opening their own Contratos Activos never needs to
    // know/send their boxId. versionId is meaningless without an explicit
    // boxId (an athlete never requests one anyway), so it's ignored here.
    if (versionId) return null;
    boxId = (await resolveBoxIdForAthlete(userId)) ?? undefined;
    if (!boxId) return null;
  }

  if (versionId) {
    const [version] = await db
      .select({ objectPath: contractDocumentVersionsTable.objectPath })
      .from(contractDocumentVersionsTable)
      .where(
        and(
          eq(contractDocumentVersionsTable.id, versionId),
          eq(contractDocumentVersionsTable.boxId, boxId),
          eq(contractDocumentVersionsTable.slug, slug),
        ),
      );
    if (!version) return null;
    return {
      objectPath: version.objectPath,
      authorized: await isBoxOwnerOrSuperAdmin(userId, boxId),
    };
  }

  const [doc] = await db
    .select({ objectPath: contractDocumentsTable.objectPath })
    .from(contractDocumentsTable)
    .where(and(eq(contractDocumentsTable.boxId, boxId), eq(contractDocumentsTable.slug, slug)));
  if (!doc?.objectPath) return null;

  if (await isBoxOwnerOrSuperAdmin(userId, boxId)) {
    return { objectPath: doc.objectPath, authorized: true };
  }
  const athleteBoxId = await resolveBoxIdForAthlete(userId);
  return { objectPath: doc.objectPath, authorized: athleteBoxId === boxId };
}

/**
 * GET /contracts/signed-url?userId=...&slug=...&boxId=...&versionId=...
 *
 * The `contracts` bucket is private — every relative objectPath needs a
 * short-lived signed URL to actually open. Older documents (seeded into
 * the public bucket before Fase B) already carry a full URL and are
 * returned unchanged. Never logs an objectPath or the signed URL itself.
 */
router.get("/contracts/signed-url", async (req: Request, res: Response) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const slug = typeof req.query.slug === "string" ? req.query.slug : undefined;
  const boxId = typeof req.query.boxId === "string" ? req.query.boxId : undefined;
  const versionId = typeof req.query.versionId === "string" ? req.query.versionId : undefined;
  if (!userId || !slug) {
    res.status(400).json({ error: "userId and slug are required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, userId))) return;

  try {
    const resolved = await resolveContractFile(userId, boxId, slug, versionId);
    if (!resolved?.authorized) {
      res.status(404).json({ error: "Documento no encontrado" });
      return;
    }

    if (/^https?:\/\//i.test(resolved.objectPath)) {
      res.json(GetContractSignedUrlResponse.parse({ url: resolved.objectPath, expiresAt: null }));
      return;
    }

    const { data, error } = await getSupabaseAdmin()
      .storage.from(CONTRACTS_BUCKET)
      .createSignedUrl(resolved.objectPath, SIGNED_URL_TTL_SECONDS);
    if (error || !data) {
      res.status(404).json({ error: "Documento no encontrado" });
      return;
    }

    res.json(
      GetContractSignedUrlResponse.parse({
        url: data.signedUrl,
        expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error creating signed contract url");
    res.status(500).json({ error: "No se pudo generar el enlace" });
  }
});

/**
 * GET /contracts/acceptance?userId=...
 */
router.get("/contracts/acceptance", async (req: Request, res: Response) => {
  const userId =
    typeof req.query.userId === "string" ? req.query.userId : undefined;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, userId))) return;

  try {
    const [row] = await db
      .select()
      .from(contractAcceptancesTable)
      .where(eq(contractAcceptancesTable.userId, userId));

    let birthdayVisibilityConsent = false;
    if (row) {
      const [consentRow] = await db
        .select({ consent: birthdayVisibilityConsentsTable.consent })
        .from(birthdayVisibilityConsentsTable)
        .where(eq(birthdayVisibilityConsentsTable.userId, userId));
      birthdayVisibilityConsent = consentRow?.consent ?? false;
    }

    const pendingSlugs = await computePendingSlugs(userId);

    res.json(
      GetContractAcceptanceResponse.parse({
        acceptance: row
          ? {
              userId: row.userId,
              emergencyContactName: row.emergencyContactName,
              emergencyContactPhone: row.emergencyContactPhone,
              acceptedAt: row.acceptedAt.toISOString(),
              guardianName: row.guardianName,
              guardianRelationship: row.guardianRelationship,
              minorDataConsentAt: row.minorDataConsentAt?.toISOString() ?? null,
              birthdayVisibilityConsent,
            }
          : null,
        pendingSlugs,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error fetching contract acceptance");
    res.status(500).json({ error: "Failed to fetch acceptance" });
  }
});

/**
 * POST /contracts/acceptance
 *
 * Records the final acceptance with a server-generated timestamp. Rejects
 * the request if the user has not read every contract document yet, so the
 * check can't be bypassed from the client.
 */
router.post("/contracts/acceptance", async (req: Request, res: Response) => {
  const parsed = AcceptContractsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;
  try {
    const boxId = await resolveBoxIdForAthlete(parsed.data.userId);
    if (!boxId) {
      res.status(409).json({
        error: "No perteneces a ningún box todavía.",
      });
      return;
    }
    const {
      userId,
      emergencyContactName,
      emergencyContactPhone,
      guardianName,
      guardianRelationship,
      minorDataConsent,
      birthdayVisibilityConsent,
      birthdayVisibilityConsentTextVersion,
    } = parsed.data;

    // Whether this is the member's FIRST acceptance ever — the birthday-
    // visibility checkbox only has any effect here on that first
    // submission. A later re-acceptance (e.g. after the contract text
    // changes) must never be able to flip it back on through this path;
    // by then the app no longer even renders the checkbox, but this is
    // the server-side half of "once accepted, the app can't reactivate
    // it" — a replayed/crafted request can't bypass it either.
    const [existingAcceptance] = await db
      .select({ userId: contractAcceptancesTable.userId })
      .from(contractAcceptancesTable)
      .where(eq(contractAcceptancesTable.userId, userId));
    const isFirstAcceptance = !existingAcceptance;

    // A guardian name is the signal that this is a minor accepting. For a
    // minor, the separate data-processing consent is mandatory too.
    const isMinor = !!guardianName;
    if (isMinor && minorDataConsent !== true) {
      res.status(409).json({
        error:
          "Falta el consentimiento de tratamiento de los datos personales del menor.",
      });
      return;
    }

    const documents = await db
      .select()
      .from(contractDocumentsTable)
      .where(
        and(
          eq(contractDocumentsTable.boxId, boxId),
          eq(contractDocumentsTable.audience, "athlete"),
        ),
      );
    const progress = await db
      .select()
      .from(contractReadProgressTable)
      .where(eq(contractReadProgressTable.userId, userId));
    const readSlugs = new Set(progress.map((row) => row.documentSlug));
    const unread = documents.filter((doc) => !readSlugs.has(doc.slug));

    if (unread.length > 0) {
      res.status(409).json({
        error: `Debes leer todos los documentos antes de aceptar: ${unread
          .map((doc) => doc.title)
          .join(", ")}`,
      });
      return;
    }

    const acceptedAt = new Date();
    // Its own timestamp on purpose — a distinct act from accepting the
    // contract, even if it happens in the same submission. Null for adults.
    const minorDataConsentAt = isMinor ? new Date() : null;
    await db
      .insert(contractAcceptancesTable)
      .values({
        userId,
        emergencyContactName,
        emergencyContactPhone,
        acceptedAt,
        guardianName: guardianName ?? null,
        guardianRelationship: guardianRelationship ?? null,
        minorDataConsentAt,
        seenByOwnerAt: null,
        boxId,
      })
      .onConflictDoUpdate({
        target: contractAcceptancesTable.userId,
        // Reset seenByOwnerAt so a re-acceptance notifies the owner again.
        set: {
          emergencyContactName,
          emergencyContactPhone,
          acceptedAt,
          guardianName: guardianName ?? null,
          guardianRelationship: guardianRelationship ?? null,
          minorDataConsentAt,
          seenByOwnerAt: null,
        },
      });

    // Grant birthday-visibility consent only on the FIRST acceptance, and
    // only for a minor — see isFirstAcceptance above for why a later
    // re-acceptance can never flip this on, regardless of what's sent.
    const grantsBirthdayVisibility =
      isMinor && isFirstAcceptance && birthdayVisibilityConsent === true;
    if (grantsBirthdayVisibility) {
      await db
        .insert(birthdayVisibilityConsentsTable)
        .values({
          userId,
          boxId,
          consent: true,
          grantedAt: acceptedAt,
          source: "contrato",
          grantedByEmail: null,
          textVersion: birthdayVisibilityConsentTextVersion ?? null,
          revokedAt: null,
        })
        .onConflictDoUpdate({
          target: birthdayVisibilityConsentsTable.userId,
          set: {
            boxId,
            consent: true,
            grantedAt: acceptedAt,
            source: "contrato",
            grantedByEmail: null,
            textVersion: birthdayVisibilityConsentTextVersion ?? null,
            revokedAt: null,
          },
        });
    }

    res.json(
      AcceptContractsResponse.parse({
        userId,
        emergencyContactName,
        emergencyContactPhone,
        acceptedAt: acceptedAt.toISOString(),
        guardianName: guardianName ?? null,
        guardianRelationship: guardianRelationship ?? null,
        minorDataConsentAt: minorDataConsentAt?.toISOString() ?? null,
        birthdayVisibilityConsent: grantsBirthdayVisibility,
      }),
    );

    // Notify the owner right away instead of relying on them opening the
    // hidden admin panel to see the in-app badge. Fire-and-forget: a
    // notification failure must not affect the response already sent.
    void (async () => {
      const [user] = await db
        .select({
          name: wodplaceUsersTable.name,
          email: wodplaceUsersTable.email,
        })
        .from(wodplaceUsersTable)
        .where(eq(wodplaceUsersTable.id, userId));

      if (user) {
        await sendContractAcceptanceEmail({
          memberName: user.name,
          memberEmail: user.email,
          acceptedAt,
        });
      }
    })().catch((error) => {
      req.log.error(
        { err: error },
        "Error sending contract acceptance notification email",
      );
    });
  } catch (error) {
    req.log.error({ err: error }, "Error recording contract acceptance");
    res.status(400).json({
      error:
        "Failed to record acceptance. Make sure the user has been synced first.",
    });
  }
});

/**
 * PATCH /contracts/acceptance/:userId/birthday-consent
 *
 * Self-service only, and only ever to false. Granting (true) can only
 * come from the guardian's checkbox inside POST /contracts/acceptance
 * (first acceptance only) or from a box admin (via the direct-to-Postgres
 * RLS-gated path in box-admin, not this endpoint) — enforced here in
 * application code since this endpoint runs on a privileged DB
 * connection that bypasses RLS entirely.
 */
router.patch(
  "/contracts/acceptance/:userId/birthday-consent",
  async (req: Request, res: Response) => {
    const userId = String(req.params.userId);
    const parsed = SetBirthdayConsentSelfBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }
    if (parsed.data.consent !== false) {
      res.status(400).json({
        error:
          "La autorización solo puede otorgarse al aceptar el contrato o por un administrador del box.",
      });
      return;
    }
    if (!(await assertOwnsAccount(req, res, userId))) return;

    try {
      const boxId = await resolveBoxIdForAthlete(userId);
      if (!boxId) {
        res.status(404).json({ error: "No perteneces a ningún box." });
        return;
      }
      await db
        .insert(birthdayVisibilityConsentsTable)
        .values({
          userId,
          boxId,
          consent: false,
          revokedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: birthdayVisibilityConsentsTable.userId,
          set: {
            consent: false,
            revokedAt: new Date(),
          },
        });

      res.json(SetBirthdayConsentSelfResponse.parse({ birthdayVisibilityConsent: false }));
    } catch (error) {
      req.log.error({ err: error }, "Error withdrawing birthday-visibility consent");
      res.status(500).json({ error: "Failed to update consent" });
    }
  },
);

export default router;

import {
  AcceptContractsBody,
  AcceptContractsResponse,
  GetContractAcceptanceResponse,
  ListContractsResponse,
  MarkContractReadBody,
  MarkContractReadResponse,
} from "@workspace/api-zod";
import {
  contractAcceptancesTable,
  contractDocumentsTable,
  contractReadProgressTable,
  db,
  wodplaceUsersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

import { resolveBoxId } from "../lib/boxContext";
import { ensureDefaultDocuments } from "../lib/contractDocuments";
import { sendContractAcceptanceEmail } from "../lib/ownerNotifications";

const router: IRouter = Router();

/**
 * GET /contracts?userId=...
 *
 * Lists the contract documents. When userId is provided, each document is
 * annotated with whether that user has read it yet.
 */
router.get("/contracts", async (req: Request, res: Response) => {
  try {
    const boxId = await resolveBoxId();
    await ensureDefaultDocuments(boxId);
    const userId =
      typeof req.query.userId === "string" ? req.query.userId : undefined;

    const documents = await db
      .select()
      .from(contractDocumentsTable)
      .where(eq(contractDocumentsTable.boxId, boxId));

    const readSlugs = new Map<string, string>();
    if (userId) {
      const progress = await db
        .select()
        .from(contractReadProgressTable)
        .where(eq(contractReadProgressTable.userId, userId));
      for (const row of progress) {
        readSlugs.set(row.documentSlug, row.readAt.toISOString());
      }
    }

    const result = documents.map((doc) => ({
      slug: doc.slug,
      title: doc.title,
      objectPath: doc.objectPath,
      read: readSlugs.has(doc.slug),
      readAt: readSlugs.get(doc.slug) ?? null,
    }));

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

  try {
    const slug = String(req.params.slug);
    const { userId } = parsed.data;

    const [document] = await db
      .select()
      .from(contractDocumentsTable)
      .where(eq(contractDocumentsTable.slug, slug));
    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const readAt = new Date();
    await db
      .insert(contractReadProgressTable)
      .values({ userId, documentSlug: slug, readAt })
      .onConflictDoUpdate({
        target: [
          contractReadProgressTable.userId,
          contractReadProgressTable.documentSlug,
        ],
        set: { readAt },
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

  try {
    const [row] = await db
      .select()
      .from(contractAcceptancesTable)
      .where(eq(contractAcceptancesTable.userId, userId));

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
            }
          : null,
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

  try {
    const boxId = await resolveBoxId();
    await ensureDefaultDocuments(boxId);
    const {
      userId,
      emergencyContactName,
      emergencyContactPhone,
      guardianName,
      guardianRelationship,
    } = parsed.data;

    const documents = await db
      .select()
      .from(contractDocumentsTable)
      .where(eq(contractDocumentsTable.boxId, boxId));
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
    await db
      .insert(contractAcceptancesTable)
      .values({
        userId,
        emergencyContactName,
        emergencyContactPhone,
        acceptedAt,
        guardianName: guardianName ?? null,
        guardianRelationship: guardianRelationship ?? null,
        seenByOwnerAt: null,
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
          seenByOwnerAt: null,
        },
      });

    res.json(
      AcceptContractsResponse.parse({
        userId,
        emergencyContactName,
        emergencyContactPhone,
        acceptedAt: acceptedAt.toISOString(),
        guardianName: guardianName ?? null,
        guardianRelationship: guardianRelationship ?? null,
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

export default router;

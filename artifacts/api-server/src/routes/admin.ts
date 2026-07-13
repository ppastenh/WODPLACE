import {
  AckContractAcceptancesResponse,
  ListAdminContractAcceptancesResponse,
  ListAdminContractsResponse,
  UpdateAdminContractBody,
  UpdateAdminContractResponse,
  VerifyAdminCodeBody,
  type AckContractAcceptancesResult,
  type AdminCodeCheckResult,
  type ContractAcceptanceNotification,
} from "@workspace/api-zod";
import {
  contractAcceptancesTable,
  contractDocumentsTable,
  db,
  wodplaceUsersTable,
} from "@workspace/db";
import { desc, eq, isNull } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

import { requireAdminCode } from "../lib/adminAuth";
import { ensureDefaultDocuments } from "../lib/contractDocuments";

const router: IRouter = Router();

/**
 * POST /admin/verify
 *
 * Used by the hidden admin screen's code prompt. Always responds 200 so the
 * UI can show a plain "incorrect code" message instead of a network error.
 */
router.post("/admin/verify", async (req: Request, res: Response) => {
  const parsed = VerifyAdminCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  const expected = process.env.ADMIN_ACCESS_CODE;
  const ok = Boolean(expected) && parsed.data.code === expected;
  const result: AdminCodeCheckResult = { ok };
  res.json(result);
});

/**
 * GET /admin/contracts
 *
 * Lists contract documents for the admin panel (current title + whether a
 * PDF has been uploaded yet).
 */
router.get(
  "/admin/contracts",
  requireAdminCode,
  async (req: Request, res: Response) => {
    try {
      await ensureDefaultDocuments();
      const documents = await db.select().from(contractDocumentsTable);
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
  requireAdminCode,
  async (req: Request, res: Response) => {
    const parsed = UpdateAdminContractBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    try {
      const slug = String(req.params.slug);
      const { objectPath, title } = parsed.data;

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
  requireAdminCode,
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
  requireAdminCode,
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

export default router;

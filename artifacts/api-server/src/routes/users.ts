import { SyncUserBody, SyncUserResponse } from "@workspace/api-zod";
import { wodplaceUsersTable, db } from "@workspace/db";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

/**
 * POST /users
 *
 * Upserts the mobile app's locally-generated user id/name/email so later
 * contract read-progress and acceptance rows have a stable owner to attach
 * to. There is no session/auth here — the client is trusted to send its own
 * local id, matching the rest of WODPLACE's current mock-auth model.
 */
router.post("/users", async (req: Request, res: Response) => {
  const parsed = SyncUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { id, name, email } = parsed.data;

    const [row] = await db
      .insert(wodplaceUsersTable)
      .values({ id, name, email })
      .onConflictDoUpdate({
        target: wodplaceUsersTable.id,
        set: { name, email },
      })
      .returning();

    res.json(SyncUserResponse.parse(row));
  } catch (error) {
    req.log.error({ err: error }, "Error syncing user");
    res.status(500).json({ error: "Failed to sync user" });
  }
});

export default router;

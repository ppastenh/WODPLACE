import {
  ListNotificationsQueryParams,
  ListNotificationsResponse,
  MarkAllNotificationsReadBody,
  MarkNotificationReadBody,
  MarkNotificationReadParams,
} from "@workspace/api-zod";
import { db, wodplaceNotificationsTable } from "@workspace/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

router.get("/notifications", async (req: Request, res: Response) => {
  const parsed = ListNotificationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(wodplaceNotificationsTable)
      .where(eq(wodplaceNotificationsTable.userId, parsed.data.userId))
      .orderBy(desc(wodplaceNotificationsTable.createdAt));

    res.json(
      ListNotificationsResponse.parse(
        rows.map((row) => ({
          id: row.id,
          userId: row.userId,
          title: row.title,
          body: row.body,
          createdAt: row.createdAt.toISOString(),
          read: row.readAt !== null,
        })),
      ),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error listing notifications");
    res.status(500).json({ error: "Failed to list notifications" });
  }
});

router.post("/notifications/:id/read", async (req: Request, res: Response) => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  const body = MarkNotificationReadBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Missing or invalid notification fields" });
    return;
  }

  try {
    await db
      .update(wodplaceNotificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(wodplaceNotificationsTable.id, params.data.id),
          eq(wodplaceNotificationsTable.userId, body.data.userId),
        ),
      );
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Error marking notification as read");
    res.status(400).json({ error: "Failed to mark notification as read" });
  }
});

router.post("/notifications/read-all", async (req: Request, res: Response) => {
  const body = MarkAllNotificationsReadBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  try {
    await db
      .update(wodplaceNotificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(wodplaceNotificationsTable.userId, body.data.userId),
          isNull(wodplaceNotificationsTable.readAt),
        ),
      );
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Error marking notifications as read");
    res.status(400).json({ error: "Failed to mark notifications as read" });
  }
});

export default router;
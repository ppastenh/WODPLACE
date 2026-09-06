import { SyncUserBody, SyncUserResponse } from "@workspace/api-zod";
import { wodplaceUsersTable, db } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

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

/**
 * PATCH /users/:id/avatar
 *
 * Sets the athlete's profile photo (uploaded separately via
 * POST /storage/avatar-uploads/request-url — this just records the
 * resulting URL). Same trust model as POST /users: no session/auth, the
 * caller is trusted to be that user.
 */
const SetAvatarBody = z.object({ avatarUrl: z.string().url() });

router.patch("/users/:id/avatar", async (req: Request, res: Response) => {
  const parsed = SetAvatarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid avatarUrl" });
    return;
  }
  try {
    const [row] = await db
      .update(wodplaceUsersTable)
      .set({ avatarUrl: parsed.data.avatarUrl })
      .where(eq(wodplaceUsersTable.id, String(req.params.id)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ id: row.id, name: row.name, avatarUrl: row.avatarUrl });
  } catch (error) {
    req.log.error({ err: error }, "Error setting avatar");
    res.status(500).json({ error: "Failed to set avatar" });
  }
});

/**
 * GET /users/:id/public-profile
 *
 * The athlete-facing profile shown from Comunidad (tapping another
 * member's name/avatar) — deliberately narrow: identity + join date only,
 * never status/plan/payments/contracts, which stay admin-only in box-admin.
 * `memberSince` is the earliest box_members.joined_at across every box this
 * user belongs to (box_members is Supabase-managed, not modelled in
 * @workspace/db — see boxes.ts for the same raw-SQL pattern).
 */
router.get(
  "/users/:id/public-profile",
  async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const [user] = await db
        .select({
          id: wodplaceUsersTable.id,
          name: wodplaceUsersTable.name,
          avatarUrl: wodplaceUsersTable.avatarUrl,
        })
        .from(wodplaceUsersTable)
        .where(eq(wodplaceUsersTable.id, id));
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const memberSince = await db.execute<{ min: string | null }>(sql`
        SELECT min(joined_at) FROM box_members WHERE user_id = ${id}
      `);

      res.json({
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        memberSince: memberSince.rows[0]?.min ?? null,
      });
    } catch (error) {
      req.log.error({ err: error }, "Error fetching public profile");
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  },
);

export default router;

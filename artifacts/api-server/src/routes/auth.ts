import { db, wodplaceUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

import { requireSupabaseUser } from "../lib/supabaseAuth";

const router: IRouter = Router();

/**
 * GET /auth/whoami
 *
 * Proof-of-concept for Fase 1 of the real-auth migration — proves the full
 * pipeline end-to-end (wodplace's Supabase client -> JWT -> requireSupabaseUser
 * -> real identity, cross-checked against wodplace_users.auth_user_id) works,
 * without any existing endpoint depending on it yet. Not used by the app.
 */
router.get("/auth/whoami", requireSupabaseUser, async (req: Request, res: Response) => {
  const supabaseUser = req.supabaseUser!;
  try {
    const [wodplaceUser] = await db
      .select({ id: wodplaceUsersTable.id, name: wodplaceUsersTable.name, email: wodplaceUsersTable.email })
      .from(wodplaceUsersTable)
      .where(eq(wodplaceUsersTable.authUserId, supabaseUser.id));

    res.json({
      supabaseUserId: supabaseUser.id,
      supabaseEmail: supabaseUser.email,
      wodplaceUser: wodplaceUser ?? null,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error resolving whoami");
    res.status(500).json({ error: "Failed to resolve identity" });
  }
});

export default router;

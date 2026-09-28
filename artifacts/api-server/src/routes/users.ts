import { SyncUserBody, SyncUserResponse } from "@workspace/api-zod";
import { wodplaceUsersTable, db } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

import { assertOwnsAccount, requireSupabaseUser, resolveSupabaseUser } from "../lib/supabaseAuth";

const router: IRouter = Router();

/**
 * GET /users/me
 *
 * Fase 2 of the real-auth migration: the athlete-facing "who am I, what's
 * my profile" call for a real account — login()/app boot use this (via the
 * verified JWT, see requireSupabaseUser) instead of trusting a
 * client-supplied id, the way every other wodplace endpoint still does
 * today. Mock accounts never call this; they keep using the local
 * AsyncStorage flow untouched.
 */
router.get("/users/me", requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const [user] = await db
      .select()
      .from(wodplaceUsersTable)
      .where(eq(wodplaceUsersTable.authUserId, req.supabaseUser!.id));
    if (!user) {
      res.status(404).json({ error: "No wodplace profile linked to this account" });
      return;
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      rank: user.rank,
      phrase: user.phrase,
      birthdate: user.birthdate,
      phone: user.phone,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error fetching own profile");
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/**
 * POST /users
 *
 * Upserts the mobile app's locally-generated user id/name/email so later
 * contract read-progress and acceptance rows have a stable owner to attach
 * to. Unlike every other endpoint here, this one is ALSO how a brand-new
 * mock account (still simulated Google/Apple login, Fase 5) gets its very
 * first row — so it can't use assertOwnsAccount as-is, which 404s when the
 * row doesn't exist yet. Instead: a genuinely new id (no row yet) or an
 * existing not-yet-migrated mock row is trusted as before; an existing
 * MIGRATED row now requires a matching Supabase JWT, closing the hole where
 * this upsert could otherwise overwrite a real athlete's name/email just by
 * knowing their id.
 */
router.post("/users", async (req: Request, res: Response) => {
  const parsed = SyncUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }
  const [existing] = await db
    .select({ authUserId: wodplaceUsersTable.authUserId })
    .from(wodplaceUsersTable)
    .where(eq(wodplaceUsersTable.id, parsed.data.id));
  if (existing?.authUserId) {
    const supabaseUser = await resolveSupabaseUser(req);
    if (!supabaseUser || supabaseUser.id !== existing.authUserId) {
      res.status(supabaseUser ? 403 : 401).json({ error: supabaseUser ? "Forbidden" : "Missing or invalid Authorization token" });
      return;
    }
  }

  try {
    const { id, name, email, birthdate } = parsed.data;

    const [row] = await db
      .insert(wodplaceUsersTable)
      .values({ id, name, email, birthdate })
      .onConflictDoUpdate({
        target: wodplaceUsersTable.id,
        // Never overwrite an existing birthdate with null — a sync call
        // that doesn't carry it (e.g. an older cached client) shouldn't
        // erase one already on file.
        set: birthdate
          ? { name, email, birthdate }
          : { name, email },
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
 * resulting URL). For a not-yet-migrated mock account the caller is still
 * trusted to be that user, same as always; a migrated account now needs a
 * matching Supabase JWT (Fase 4, see assertOwnsAccount).
 */
const SetAvatarBody = z.object({ avatarUrl: z.string().url() });

router.patch("/users/:id/avatar", async (req: Request, res: Response) => {
  const parsed = SetAvatarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid avatarUrl" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, String(req.params.id)))) return;
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
 * PATCH /users/:id/profile
 *
 * Sets self-expression fields shown on the public profile: currently just
 * phrase (a short bio line). Deliberately excludes `status` ("Cuenta
 * Activa/Inactiva"): that reads as account standing, same category as
 * payments/contracts, kept out of the public profile. Also deliberately
 * excludes `rank`: that's coach-assigned from box-admin only (RLS-gated
 * there), never self-service — api-server's DB role bypasses RLS, so
 * accepting rank here would let any athlete set their own level. Ownership
 * of the account itself is enforced by assertOwnsAccount (Fase 4), same as
 * every other endpoint that acts on a specific userId.
 */
const UpdateProfileFieldsBody = z
  .object({
    phrase: z.string().max(120).optional(),
  })
  .refine((v) => v.phrase !== undefined, {
    message: "Nothing to update",
  });

router.patch("/users/:id/profile", async (req: Request, res: Response) => {
  const parsed = UpdateProfileFieldsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, String(req.params.id)))) return;
  try {
    const [row] = await db
      .update(wodplaceUsersTable)
      .set(parsed.data)
      .where(eq(wodplaceUsersTable.id, String(req.params.id)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ id: row.id, phrase: row.phrase });
  } catch (error) {
    req.log.error({ err: error }, "Error updating profile fields");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

/**
 * GET /users/:id/public-profile
 *
 * The athlete-facing profile shown from Comunidad (tapping another
 * member's name/avatar) and from box-admin's own "Ver perfil" — deliberately
 * narrow: identity, join date, rank, and phrase. Never status/plan/payments/
 * contracts, which stay admin-only in box-admin.
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
          rank: wodplaceUsersTable.rank,
          phrase: wodplaceUsersTable.phrase,
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
        rank: user.rank,
        phrase: user.phrase,
        memberSince: memberSince.rows[0]?.min ?? null,
      });
    } catch (error) {
      req.log.error({ err: error }, "Error fetching public profile");
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  },
);

export default router;

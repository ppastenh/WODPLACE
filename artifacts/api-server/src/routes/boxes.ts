import { RedeemBoxCodeBody, RedeemBoxCodeResponse } from "@workspace/api-zod";
import { db, wodplaceUsersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

/** Shape returned when the code matches nothing (or is blank). */
const NO_MATCH = {
  joined: false,
  alreadyMember: false,
  boxId: null,
  boxName: null,
} as const;

/**
 * POST /box-memberships/redeem
 *
 * Redeems a box invite code so the mobile athlete joins that box. There is
 * no session/auth here — the client sends its own locally generated user
 * id/name/email, exactly like POST /users. The endpoint:
 *
 *   1. upserts wodplace_users (so the box_members write can't race the app's
 *      fire-and-forget syncUser call);
 *   2. finds the box whose box_settings row (key `invite_code`) equals the
 *      code, case-insensitively — a box with no such row is simply "no match";
 *   3. inserts a `box_members` row for (box_id, user_id) unless it already
 *      exists (an athlete may belong to several boxes).
 *
 * IMPORTANT — table choice: the membership is written to `box_members`, NOT
 * `user_roles`. `user_roles.user_id` is a UUID referencing auth.users (panel
 * admins/coaches — real Supabase Auth accounts), whereas mobile athletes have
 * a TEXT id from AsyncStorage and no Auth account. `box_members.user_id` is
 * TEXT -> wodplace_users(id), so the types line up, and this is also exactly
 * the table the admin panel (crossfit-dash-pro) reads its member list from —
 * so both sides now point at the same place.
 *
 * Always responds 200 for the blank / no-match cases so the app can show a
 * plain "invalid code" message instead of surfacing a network error.
 *
 * box_settings / boxes / box_members live in the shared Supabase project and
 * are managed out-of-band, so they are queried with raw SQL rather than
 * modelled in @workspace/db.
 */
router.post(
  "/box-memberships/redeem",
  async (req: Request, res: Response) => {
    const parsed = RedeemBoxCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    const { userId, name, email, code } = parsed.data;
    const normalized = code.trim().toUpperCase();

    try {
      await db
        .insert(wodplaceUsersTable)
        .values({ id: userId, name, email })
        .onConflictDoUpdate({
          target: wodplaceUsersTable.id,
          set: { name, email },
        });

      if (!normalized) {
        res.json(RedeemBoxCodeResponse.parse(NO_MATCH));
        return;
      }

      const boxLookup = await db.execute<{ box_id: string; name: string }>(sql`
        SELECT bs.box_id, b.name
        FROM box_settings bs
        JOIN boxes b ON b.id = bs.box_id
        WHERE bs.key = 'invite_code'
          AND upper(btrim(bs.value)) = ${normalized}
        LIMIT 1
      `);
      const box = boxLookup.rows[0];
      if (!box) {
        res.json(RedeemBoxCodeResponse.parse(NO_MATCH));
        return;
      }

      const existing = await db.execute(sql`
        SELECT 1
        FROM box_members
        WHERE box_id = ${box.box_id}
          AND user_id = ${userId}
        LIMIT 1
      `);

      if (existing.rows.length > 0) {
        res.json(
          RedeemBoxCodeResponse.parse({
            joined: false,
            alreadyMember: true,
            boxId: box.box_id,
            boxName: box.name,
          }),
        );
        return;
      }

      await db.execute(sql`
        INSERT INTO box_members (box_id, user_id, status)
        VALUES (${box.box_id}, ${userId}, 'activo')
        ON CONFLICT (box_id, user_id) DO NOTHING
      `);

      res.json(
        RedeemBoxCodeResponse.parse({
          joined: true,
          alreadyMember: false,
          boxId: box.box_id,
          boxName: box.name,
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Error redeeming box code");
      res.status(500).json({ error: "Failed to redeem code" });
    }
  },
);

export default router;

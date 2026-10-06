import { RedeemBoxCodeBody, RedeemBoxCodeResponse } from "@workspace/api-zod";
import { db, wodplaceUsersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

import { isAdminRequest } from "../lib/adminAuth";
import { resolveBoxIdForAthlete } from "../lib/boxContext";
import { todayDateKey } from "../lib/dateUtils";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { assertOwnsAccount } from "../lib/supabaseAuth";

const router: IRouter = Router();

// Same allowlist as social.ts's post reactions (kept as its own local
// constant, same as that file's own local `makeId` — this route file
// intentionally doesn't import from social.ts to keep the two systems
// decoupled).
const ANNOUNCEMENT_REACTION_EMOJIS = ["💪", "🔥", "👏", "❤️", "🎉"] as const;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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
    if (!(await assertOwnsAccount(req, res, userId))) return;

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

/**
 * GET /box-memberships/my-box?userId=...
 *
 * The box info shown in wodplace's "Datos Personales" screen (box-detail.tsx)
 * for an already-enrolled athlete — replaces the old hardcoded
 * constants/boxInfo.ts mock with the real data an admin fills in via
 * "Datos del Box" (POST /platform-agreement/box-details). If the athlete
 * belongs to more than one box, the most recently joined one wins — same
 * "one subscribed box" assumption the mock made.
 */
router.get("/box-memberships/my-box", async (req: Request, res: Response) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, userId))) return;

  try {
    const rows = await db.execute<{
      name: string;
      owner_name: string | null;
      location: string | null;
      contact_phone: string | null;
      whatsapp: string | null;
      instagram_url: string | null;
      facebook_url: string | null;
      tiktok_url: string | null;
      photo_url: string | null;
      plan_id: string | null;
    }>(sql`
      SELECT b.name, b.owner_name, b.location, b.contact_phone, b.whatsapp,
             b.instagram_url, b.facebook_url, b.tiktok_url, b.photo_url, bm.plan_id
      FROM box_members bm
      JOIN boxes b ON b.id = bm.box_id
      WHERE bm.user_id = ${userId}
      ORDER BY bm.created_at DESC
      LIMIT 1
    `);
    const row = rows.rows[0];
    if (!row) {
      res.json({ box: null });
      return;
    }

    res.json({
      box: {
        name: row.name,
        ownerName: row.owner_name,
        location: row.location,
        contactPhone: row.contact_phone,
        whatsapp: row.whatsapp,
        instagramUrl: row.instagram_url,
        facebookUrl: row.facebook_url,
        tiktokUrl: row.tiktok_url,
        // The box's "logo" — really just its profile photo, same concept as
        // an athlete's avatar. Set from box-admin's own "Configuración".
        photoUrl: row.photo_url,
        // null until the box_admin assigns one from their own panel — see
        // Home's "Progreso Mensual" gating (shouldn't show before this
        // exists, even though the athlete already belongs to the box).
        planId: row.plan_id,
      },
    });
  } catch (error) {
    req.log.error({ err: error }, "Error loading my-box info");
    res.status(500).json({ error: "Failed to load box info" });
  }
});

/**
 * GET /box-memberships/my-plans?userId=...
 *
 * Real plans for this athlete's box (the same `plans` table box-admin's own
 * "Planes" page manages), replacing wodplace's old hardcoded "Plan
 * Ilimitado" mock — marks whichever one matches this athlete's
 * box_members.plan_id as `isSubscribed`. No box -> empty list; a box with
 * no plan_id assigned yet still sees the box's real plans, just none
 * marked as theirs.
 *
 * For the subscribed plan only, also computes the athlete's current-period
 * stats (classesUsedInPeriod/classesRemaining/daysUntilRenewal) — the
 * period window is [next_payment_at - duration_days, next_payment_at).
 * box_members.next_payment_at is now a real, maintained date (box-admin's
 * "Registrar pago"/"Renovar" advance it, and assigning a plan seeds it) —
 * see computeNextPaymentAt on the box-admin side. When it's still null (no
 * payment or plan assignment has happened yet), these all come back null
 * rather than guessing a period from some other date.
 */
router.get("/box-memberships/my-plans", async (req: Request, res: Response) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, userId))) return;

  try {
    const boxId = await resolveBoxIdForAthlete(userId);
    if (!boxId) {
      res.json({ plans: [] });
      return;
    }

    const myMembershipRows = await db.execute<{ plan_id: string | null; next_payment_at: string | null }>(sql`
      SELECT plan_id, next_payment_at FROM box_members WHERE box_id = ${boxId} AND user_id = ${userId} LIMIT 1
    `);
    const myPlanId = myMembershipRows.rows[0]?.plan_id ?? null;
    const nextPaymentAt = myMembershipRows.rows[0]?.next_payment_at ?? null;

    const rows = await db.execute<{
      id: string;
      name: string;
      price: string;
      duration_days: number;
      classes_per_period: number | null;
      benefits: string[] | null;
      is_featured: boolean;
    }>(sql`
      SELECT id, name, price, duration_days, classes_per_period, benefits, is_featured
      FROM plans
      WHERE box_id = ${boxId} AND is_active = true
      ORDER BY price ASC
    `);

    const myPlan = rows.rows.find((r) => r.id === myPlanId);
    let daysUntilRenewal: number | null = null;
    let classesUsedInPeriod: number | null = null;
    let classesRemaining: number | null = null;

    if (myPlan && nextPaymentAt) {
      const periodEnd = new Date(`${nextPaymentAt}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      daysUntilRenewal = Math.round((periodEnd.getTime() - today.getTime()) / 86_400_000);

      if (myPlan.classes_per_period != null) {
        const periodStart = new Date(periodEnd);
        periodStart.setDate(periodStart.getDate() - myPlan.duration_days);

        const usedRows = await db.execute<{ count: number }>(sql`
          SELECT count(*)::int AS count
          FROM class_bookings cb
          JOIN class_sessions cs ON cs.id = cb.session_id
          WHERE cb.user_id = ${userId} AND cb.status = 'inscrito'
            AND cs.session_date >= ${periodStart.toISOString().slice(0, 10)}
            AND cs.session_date < ${nextPaymentAt}
        `);
        classesUsedInPeriod = usedRows.rows[0]?.count ?? 0;
        classesRemaining = Math.max(0, myPlan.classes_per_period - classesUsedInPeriod);
      }
    }

    res.json({
      plans: rows.rows.map((r) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price),
        durationDays: r.duration_days,
        classesPerPeriod: r.classes_per_period,
        benefits: r.benefits ?? [],
        isFeatured: r.is_featured,
        isSubscribed: r.id === myPlanId,
        daysUntilRenewal: r.id === myPlanId ? daysUntilRenewal : null,
        classesUsedInPeriod: r.id === myPlanId ? classesUsedInPeriod : null,
        classesRemaining: r.id === myPlanId ? classesRemaining : null,
      })),
    });
  } catch (error) {
    req.log.error({ err: error }, "Error loading my-plans");
    res.status(500).json({ error: "Failed to load plans" });
  }
});

/** Whole-number days from `now` (inclusive of today = 0) until the next
 *  occurrence of `month`/`day`, ignoring year entirely. `now` must already
 *  be Chile's calendar date (see chileToday()) — this function itself just
 *  does date-math on whatever y/m/d it's handed, same as any JS Date
 *  arithmetic. Feb 29 in a non-leap `now.getFullYear()`/`+1` rolls over to
 *  March 1 automatically (JS Date's own normalization) — the chosen, and
 *  simplest, answer for a leap birthday in a non-leap year.
 */
function daysUntilNextOccurrence(month: number, day: number, now: Date): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), month - 1, day);
  if (next.getTime() < today.getTime()) {
    next = new Date(now.getFullYear() + 1, month - 1, day);
  }
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

/** Chile's actual calendar date, as a plain Date used only for calendar
 *  math (getFullYear/getMonth/getDate) — never as a real instant. Building
 *  it from todayDateKey()'s Chile-aware y/m/d, rather than calling
 *  `new Date()` and reading its LOCAL y/m/d (the exact bug already fixed
 *  for the WOD-del-día feature — see dateUtils.ts), is what makes "today"
 *  correct regardless of the server's own timezone. */
function chileToday(): Date {
  const [y, m, d] = todayDateKey().split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Whole-years age as of `today` (a chileToday()-shaped Date) from a
 *  Postgres `date` column's "YYYY-MM-DD" string. Used only to decide
 *  whether a member is a minor for the birthdays list — never returned to
 *  any client. */
function ageAt(birthdate: string, today: Date): number {
  const [by, bm, bd] = birthdate.split("-").map(Number);
  let age = today.getFullYear() - by;
  const hadBirthdayThisYear =
    today.getMonth() + 1 > bm || (today.getMonth() + 1 === bm && today.getDate() >= bd);
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/**
 * GET /box-memberships/upcoming-birthdays?userId=&limit=
 *
 * Real per-box birthdays, replacing Home's old hardcoded 3-name mock.
 * Only birthdays within BIRTHDAY_WINDOW_DAYS days from today are returned —
 * this is a heads-up notice, not a full roster, so anything further out is
 * dropped rather than shown early. Excludes the caller's own upcoming
 * birthday (they get their own "¡Feliz cumpleaños!" card on Home instead).
 *
 * Deliberately never returns the birth YEAR or age — only month/day, both
 * here and in wodplace_users.birthdate's own doc comment — celebrating a
 * birthday doesn't require exposing anyone's age to the rest of the box.
 *
 * Minors (by birthdate, not by whether they happen to have a guardianName
 * on file — see contracts.ts, which uses that signal for a different,
 * unrelated purpose) are included ONLY when
 * birthday_visibility_consents.consent is true for them, and only with
 * their first name — see routes/contracts.ts and
 * supabase/migrations/20261005090000_birthday_visibility_consents.sql for
 * how that consent is granted/withdrawn. A minor with no consent row at
 * all is excluded, same as one with consent explicitly false.
 */
const BIRTHDAY_WINDOW_DAYS = 7;
const MINOR_AGE_CUTOFF = 18;

router.get("/box-memberships/upcoming-birthdays", async (req: Request, res: Response) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, userId))) return;

  try {
    const boxId = await resolveBoxIdForAthlete(userId);
    if (!boxId) {
      res.json({ birthdays: [] });
      return;
    }

    const rows = await db.execute<{
      name: string;
      birthdate: string;
      month: number;
      day: number;
      birthday_visibility_consent: boolean;
    }>(sql`
      SELECT wu.name,
             wu.birthdate,
             extract(month from wu.birthdate)::int AS month,
             extract(day from wu.birthdate)::int AS day,
             coalesce(bvc.consent, false) AS birthday_visibility_consent
      FROM box_members bm
      JOIN wodplace_users wu ON wu.id = bm.user_id
      LEFT JOIN birthday_visibility_consents bvc ON bvc.user_id = wu.id
      WHERE bm.box_id = ${boxId} AND wu.birthdate IS NOT NULL AND wu.id <> ${userId}
    `);

    const today = chileToday();
    const birthdays = rows.rows
      .filter((r) => {
        const isMinor = ageAt(r.birthdate, today) < MINOR_AGE_CUTOFF;
        return !isMinor || r.birthday_visibility_consent;
      })
      .map((r) => {
        const isMinor = ageAt(r.birthdate, today) < MINOR_AGE_CUTOFF;
        return {
          name: isMinor ? firstName(r.name) : r.name,
          month: r.month,
          day: r.day,
          daysUntil: daysUntilNextOccurrence(r.month, r.day, today),
        };
      })
      .filter((b) => b.daysUntil <= BIRTHDAY_WINDOW_DAYS)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, limit);

    res.json({ birthdays });
  } catch (error) {
    req.log.error({ err: error }, "Error loading upcoming birthdays");
    res.status(500).json({ error: "Failed to load upcoming birthdays" });
  }
});

/** Signs a private "announcements" bucket object path, or passes through
 *  an already-absolute URL / returns null when there's no image. */
async function signAnnouncementImage(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  try {
    const { data } = await getSupabaseAdmin()
      .storage.from("announcements")
      .createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * GET /box-memberships/announcements?userId=...
 *
 * Real box-admin "Avisos" (announcements table), split for the client into:
 *   - `push`: unread, send_push=true announcements — Home shows these as a
 *     must-acknowledge popup, one at a time (most recent first). Once the
 *     athlete confirms reading one via the POST below, it drops off this list.
 *   - `pinnedPush`: the single most recent send_push=true announcement,
 *     regardless of read state — Home also shows this as a persistent card
 *     below "Progreso Mensual", so the athlete can still find it after
 *     confirming the popup (which removes it from `push`, but this stays).
 *   - `banner`: show_banner=true announcements — mixed into Comunidad's
 *     feed as regular-looking posts. Shown regardless of read state (it's a
 *     passive info card, not a one-time interruption); `readByMe` is
 *     included so the client can mark it read on first appearance.
 * Every announcement also carries `reactions`/`myReaction`/`commentCount`
 * (announcement_reactions / announcement_comments — see those tables' own
 * comments for why they're separate from social_reactions/social_comments)
 * so Comunidad's feed card can render like/comment counts without a
 * separate round trip per aviso.
 * `expires_at` only gates the `push`/`pinnedPush` lists (an "Aviso
 * Importante" can be set to stop showing after N days) — `banner` posts are
 * permanent, like any other Comunidad post, regardless of `expires_at` (see
 * box-admin's more/notifications.tsx, where the duration picker only
 * appears for send_push, not show_banner).
 * A box-less athlete gets everything empty.
 */
router.get("/box-memberships/announcements", async (req: Request, res: Response) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, userId))) return;

  try {
    const boxId = await resolveBoxIdForAthlete(userId);
    if (!boxId) {
      res.json({ push: [], pinnedPush: null, banner: [] });
      return;
    }

    const rows = await db.execute<{
      id: string;
      title: string;
      body: string;
      image_url: string | null;
      send_push: boolean;
      show_banner: boolean;
      expires_at: string | null;
      created_at: string;
    }>(sql`
      SELECT id, title, body, image_url, send_push, show_banner, expires_at, created_at
      FROM announcements
      WHERE box_id = ${boxId}
      ORDER BY created_at DESC
    `);
    const ids = rows.rows.map((r) => r.id);

    const readRows = await db.execute<{ announcement_id: string }>(sql`
      SELECT announcement_id FROM announcement_athlete_reads
      WHERE box_id = ${boxId} AND user_id = ${userId}
    `);
    const readIds = new Set(readRows.rows.map((r) => r.announcement_id));

    // `= ANY(${array})` doesn't work with drizzle's `sql` tag — an
    // interpolated array renders as a parenthesized scalar list, which
    // Postgres's ANY() rejects; sql.join below builds a real `IN (...)`.
    const idList = ids.length ? sql.join(ids.map((id) => sql`${id}`), sql`, `) : null;

    const reactionCountRows = idList
      ? await db.execute<{ announcement_id: string; emoji: string; count: number }>(sql`
          SELECT announcement_id, emoji, count(*)::int AS count
          FROM announcement_reactions
          WHERE announcement_id IN (${idList})
          GROUP BY announcement_id, emoji
        `)
      : { rows: [] as { announcement_id: string; emoji: string; count: number }[] };
    const reactionsByAnnouncement = new Map<string, { emoji: string; count: number }[]>();
    for (const r of reactionCountRows.rows) {
      const list = reactionsByAnnouncement.get(r.announcement_id) ?? [];
      list.push({ emoji: r.emoji, count: r.count });
      reactionsByAnnouncement.set(r.announcement_id, list);
    }

    const myReactionRows = idList
      ? await db.execute<{ announcement_id: string; emoji: string }>(sql`
          SELECT announcement_id, emoji FROM announcement_reactions
          WHERE user_id = ${userId} AND announcement_id IN (${idList})
        `)
      : { rows: [] as { announcement_id: string; emoji: string }[] };
    const myReactionByAnnouncement = new Map(
      myReactionRows.rows.map((r) => [r.announcement_id, r.emoji]),
    );

    const commentCountRows = idList
      ? await db.execute<{ announcement_id: string; count: number }>(sql`
          SELECT announcement_id, count(*)::int AS count
          FROM announcement_comments
          WHERE deleted_at IS NULL AND announcement_id IN (${idList})
          GROUP BY announcement_id
        `)
      : { rows: [] as { announcement_id: string; count: number }[] };
    const commentCountByAnnouncement = new Map(
      commentCountRows.rows.map((r) => [r.announcement_id, r.count]),
    );

    const withSignedImages = await Promise.all(
      rows.rows.map(async (r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        imageUrl: await signAnnouncementImage(r.image_url),
        createdAt: new Date(r.created_at).toISOString(),
        readByMe: readIds.has(r.id),
        sendPush: r.send_push,
        showBanner: r.show_banner,
        expiresAt: r.expires_at,
        reactions: reactionsByAnnouncement.get(r.id) ?? [],
        myReaction: myReactionByAnnouncement.get(r.id) ?? null,
        commentCount: commentCountByAnnouncement.get(r.id) ?? 0,
      })),
    );

    // expires_at only applies to the push side — a banner/Comunidad post
    // never expires, see the route comment above.
    const pushList = withSignedImages.filter(
      (a) => a.sendPush && (!a.expiresAt || new Date(a.expiresAt).getTime() > Date.now()),
    );

    res.json({
      push: pushList.filter((a) => !a.readByMe),
      pinnedPush: pushList[0] ?? null,
      banner: withSignedImages.filter((a) => a.showBanner),
    });
  } catch (error) {
    req.log.error({ err: error }, "Error loading announcements");
    res.status(500).json({ error: "Failed to load announcements" });
  }
});

/**
 * POST /box-memberships/announcements/:id/read  body: { userId }
 *
 * Marks one announcement as read by this athlete. Writes to
 * announcement_athlete_reads (TEXT user_id, athlete-scoped) — NOT the
 * announcement_reads table box-admin's own bell uses for staff (UUID
 * user_id), same TEXT-vs-UUID split as box_members vs user_roles.
 */
router.post("/box-memberships/announcements/:id/read", async (req: Request, res: Response) => {
  const id = typeof req.params.id === "string" ? req.params.id : undefined;
  const userId = typeof req.body?.userId === "string" ? req.body.userId : undefined;
  if (!id || !userId) {
    res.status(400).json({ error: "id and userId are required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, userId))) return;

  try {
    const announcementRows = await db.execute<{ box_id: string }>(sql`
      SELECT box_id FROM announcements WHERE id = ${id}
    `);
    const boxId = announcementRows.rows[0]?.box_id;
    if (!boxId) {
      res.status(404).json({ error: "Announcement not found" });
      return;
    }

    await db.execute(sql`
      INSERT INTO announcement_athlete_reads (announcement_id, box_id, user_id)
      VALUES (${id}, ${boxId}, ${userId})
      ON CONFLICT (announcement_id, user_id) DO NOTHING
    `);

    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Error marking announcement as read");
    res.status(500).json({ error: "Failed to mark announcement as read" });
  }
});

// ─── Aviso comments/reactions ──────────────────────────────────────────────
// Mirrors social.ts's post comments/reactions endpoints in shape, but reads
// and writes announcement_comments/announcement_reactions — see those
// tables' own doc comments in lib/db/schema/wodplace.ts for why they're
// separate tables instead of reusing social_comments/social_reactions.

router.get("/box-memberships/announcements/:id/comments", async (req: Request, res: Response) => {
  const id = typeof req.params.id === "string" ? req.params.id : undefined;
  const parsed = z
    .object({ cursor: z.string().optional(), limit: z.coerce.number().min(1).max(30).default(20) })
    .safeParse(req.query);
  if (!id || !parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { cursor, limit } = parsed.data;

  try {
    const rows = await db.execute<{
      id: string;
      announcement_id: string;
      user_id: string | null;
      author_name: string;
      body: string;
      created_at: string;
    }>(sql`
      SELECT id, announcement_id, user_id, author_name, body, created_at
      FROM announcement_comments
      WHERE announcement_id = ${id} AND deleted_at IS NULL
        ${cursor ? sql`AND created_at > ${new Date(cursor)}` : sql``}
      ORDER BY created_at ASC
      LIMIT ${limit + 1}
    `);
    const hasMore = rows.rows.length > limit;
    const page = rows.rows.slice(0, limit);
    res.json({
      comments: page.map((r) => ({
        id: r.id,
        announcementId: r.announcement_id,
        userId: r.user_id,
        authorName: r.author_name,
        body: r.body,
        createdAt: new Date(r.created_at).toISOString(),
      })),
      nextCursor: hasMore && page.length > 0 ? new Date(page[page.length - 1].created_at).toISOString() : null,
      hasMore,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error fetching announcement comments");
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/box-memberships/announcements/:id/comments", async (req: Request, res: Response) => {
  const id = typeof req.params.id === "string" ? req.params.id : undefined;
  const parsed = z
    .object({ userId: z.string(), authorName: z.string(), body: z.string().min(1).max(500) })
    .safeParse(req.body);
  if (!id || !parsed.success) {
    res.status(400).json({ error: "Missing fields" });
    return;
  }
  const { userId, authorName, body } = parsed.data;
  if (!(await assertOwnsAccount(req, res, userId))) return;

  try {
    const announcementRows = await db.execute<{ box_id: string }>(sql`
      SELECT box_id FROM announcements WHERE id = ${id}
    `);
    const boxId = announcementRows.rows[0]?.box_id;
    if (!boxId) {
      res.status(404).json({ error: "No encontrado." });
      return;
    }
    const athleteBoxId = await resolveBoxIdForAthlete(userId);
    if (athleteBoxId !== boxId) {
      res.status(403).json({ error: "Necesitás pertenecer a este box para comentar." });
      return;
    }

    const commentId = makeId("acomment");
    await db.execute(sql`
      INSERT INTO announcement_comments (id, announcement_id, user_id, author_name, body, box_id)
      VALUES (${commentId}, ${id}, ${userId}, ${authorName}, ${body}, ${boxId})
    `);
    res.status(201).json({
      id: commentId,
      announcementId: id,
      userId,
      authorName,
      body,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error({ err: error }, "Error creating announcement comment");
    res.status(500).json({ error: "No se pudo comentar." });
  }
});

router.delete(
  "/box-memberships/announcements/:id/comments/:commentId",
  async (req: Request, res: Response) => {
    const commentId = typeof req.params.commentId === "string" ? req.params.commentId : undefined;
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const isAdmin = isAdminRequest(req);
    if (!commentId || !userId) {
      res.status(400).json({ error: "Missing fields" });
      return;
    }
    if (!isAdmin && !(await assertOwnsAccount(req, res, userId))) return;

    try {
      const rows = await db.execute<{ user_id: string | null }>(sql`
        SELECT user_id FROM announcement_comments WHERE id = ${commentId} AND deleted_at IS NULL
      `);
      const comment = rows.rows[0];
      if (!comment) {
        res.status(404).json({ error: "No encontrado." });
        return;
      }
      if (!isAdmin && comment.user_id !== userId) {
        res.status(403).json({ error: "No podés eliminar este comentario." });
        return;
      }
      await db.execute(sql`
        UPDATE announcement_comments SET deleted_at = now() WHERE id = ${commentId}
      `);
      res.status(204).end();
    } catch (error) {
      req.log.error({ err: error }, "Error deleting announcement comment");
      res.status(500).json({ error: "No se pudo eliminar." });
    }
  },
);

router.post("/box-memberships/announcements/:id/reactions", async (req: Request, res: Response) => {
  const id = typeof req.params.id === "string" ? req.params.id : undefined;
  const parsed = z
    .object({ userId: z.string(), emoji: z.enum(ANNOUNCEMENT_REACTION_EMOJIS) })
    .safeParse(req.body);
  if (!id || !parsed.success) {
    res.status(400).json({ error: "emoji inválido" });
    return;
  }
  const { userId, emoji } = parsed.data;
  if (!(await assertOwnsAccount(req, res, userId))) return;

  try {
    const announcementRows = await db.execute<{ box_id: string }>(sql`
      SELECT box_id FROM announcements WHERE id = ${id}
    `);
    const boxId = announcementRows.rows[0]?.box_id;
    if (!boxId) {
      res.status(404).json({ error: "No encontrado." });
      return;
    }

    const existingRows = await db.execute<{ id: string; emoji: string }>(sql`
      SELECT id, emoji FROM announcement_reactions
      WHERE announcement_id = ${id} AND user_id = ${userId}
    `);
    const existing = existingRows.rows[0];

    let added = false;
    if (existing) {
      if (existing.emoji === emoji) {
        await db.execute(sql`DELETE FROM announcement_reactions WHERE id = ${existing.id}`);
      } else {
        await db.execute(sql`UPDATE announcement_reactions SET emoji = ${emoji} WHERE id = ${existing.id}`);
        added = true;
      }
    } else {
      const athleteBoxId = await resolveBoxIdForAthlete(userId);
      if (athleteBoxId !== boxId) {
        res.status(403).json({ error: "Necesitás pertenecer a este box para reaccionar." });
        return;
      }
      await db.execute(sql`
        INSERT INTO announcement_reactions (id, announcement_id, user_id, emoji, box_id)
        VALUES (${makeId("areaction")}, ${id}, ${userId}, ${emoji}, ${boxId})
      `);
      added = true;
    }

    const allReactions = await db.execute<{ emoji: string; count: number }>(sql`
      SELECT emoji, count(*)::int AS count FROM announcement_reactions
      WHERE announcement_id = ${id}
      GROUP BY emoji
    `);
    const myReactionRows = await db.execute<{ emoji: string }>(sql`
      SELECT emoji FROM announcement_reactions WHERE announcement_id = ${id} AND user_id = ${userId}
    `);
    res.json({
      added,
      myReaction: myReactionRows.rows[0]?.emoji ?? null,
      reactions: allReactions.rows.map((r) => ({ emoji: r.emoji, count: r.count })),
    });
  } catch (error) {
    req.log.error({ err: error }, "Error toggling announcement reaction");
    res.status(500).json({ error: "No se pudo reaccionar." });
  }
});

export default router;

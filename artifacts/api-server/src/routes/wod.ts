import { db, wodOfDayTable, wodResultsTable, wodsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

import { resolveBoxIdForAthlete } from "../lib/boxContext";
import { todayDateKey } from "../lib/dateUtils";
import { assertOwnsAccount } from "../lib/supabaseAuth";

const router: IRouter = Router();

// Low to high — see supabase/migrations/..._wod_results_level_scale.sql.
const WOD_LEVELS = ["beginner", "rookie", "scaled", "master", "rx", "elite"] as const;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * GET /wod/today?userId=
 *
 * The athlete's box's WOD published for today (see box-admin's "WOD del
 * día", which writes wod_of_day directly via Supabase). null when the box
 * hasn't published anything today, or the athlete has no box. Includes the
 * athlete's own logged result for it, if any, so the client knows whether
 * to show the result form or what was already submitted.
 */
router.get("/wod/today", async (req: Request, res: Response) => {
  const parsed = z.object({ userId: z.string().min(1) }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;
  try {
    const boxId = await resolveBoxIdForAthlete(parsed.data.userId);
    if (!boxId) {
      res.json({ wod: null });
      return;
    }

    const today = todayDateKey();
    const [row] = await db
      .select({
        wodOfDayId: wodOfDayTable.id,
        notes: wodOfDayTable.notes,
        sessionDate: wodOfDayTable.sessionDate,
        wodId: wodsTable.id,
        name: wodsTable.name,
        format: wodsTable.format,
        timeCapMinutes: wodsTable.timeCapMinutes,
        description: wodsTable.description,
      })
      .from(wodOfDayTable)
      .innerJoin(wodsTable, eq(wodsTable.id, wodOfDayTable.wodId))
      .where(and(eq(wodOfDayTable.boxId, boxId), eq(wodOfDayTable.sessionDate, today)));

    if (!row) {
      res.json({ wod: null });
      return;
    }

    const [myResult] = await db
      .select()
      .from(wodResultsTable)
      .where(and(eq(wodResultsTable.userId, parsed.data.userId), eq(wodResultsTable.wodOfDayId, row.wodOfDayId)));

    res.json({
      wod: {
        wodOfDayId: row.wodOfDayId,
        wodId: row.wodId,
        name: row.name,
        format: row.format,
        timeCapMinutes: row.timeCapMinutes,
        description: row.description,
        notes: row.notes,
        sessionDate: row.sessionDate,
        myResult: myResult
          ? {
              timeSeconds: myResult.timeSeconds,
              rounds: myResult.rounds,
              reps: myResult.reps,
              level: myResult.level,
              notes: myResult.notes,
            }
          : null,
      },
    });
  } catch (error) {
    req.log.error({ err: error }, "Error loading today's WOD");
    res.status(500).json({ error: "Failed to load today's WOD" });
  }
});

const SubmitResultBody = z.object({
  userId: z.string().min(1),
  wodOfDayId: z.string().min(1),
  timeSeconds: z.number().int().positive().optional(),
  rounds: z.number().int().min(0).optional(),
  reps: z.number().int().min(0).optional(),
  level: z.enum(WOD_LEVELS),
  notes: z.string().max(300).optional(),
});

/**
 * POST /wod-results
 *
 * Logs (or edits, on re-submit) the athlete's result for a specific day's
 * published WOD — upserts on (userId, wodOfDayId), one result per athlete
 * per publication.
 */
router.post("/wod-results", async (req: Request, res: Response) => {
  const parsed = SubmitResultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }
  const { userId, wodOfDayId, timeSeconds, rounds, reps, level, notes } = parsed.data;
  if (!(await assertOwnsAccount(req, res, userId))) return;
  try {
    const [row] = await db
      .insert(wodResultsTable)
      .values({
        id: makeId("wodresult"),
        userId,
        wodOfDayId,
        timeSeconds: timeSeconds ?? null,
        rounds: rounds ?? null,
        reps: reps ?? null,
        level,
        notes: notes ?? null,
      })
      .onConflictDoUpdate({
        target: [wodResultsTable.userId, wodResultsTable.wodOfDayId],
        set: {
          timeSeconds: timeSeconds ?? null,
          rounds: rounds ?? null,
          reps: reps ?? null,
          level,
          notes: notes ?? null,
        },
      })
      .returning();
    res.json({ result: row });
  } catch (error) {
    req.log.error({ err: error }, "Error saving WOD result");
    res.status(500).json({ error: "Failed to save result" });
  }
});

/**
 * GET /wod-results?userId=
 *
 * Full history, most recent first, each joined with its WOD's name/format —
 * the client groups by wodId to show progress on repeating hero WODs.
 */
router.get("/wod-results", async (req: Request, res: Response) => {
  const parsed = z.object({ userId: z.string().min(1) }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;
  try {
    const rows = await db
      .select({
        id: wodResultsTable.id,
        timeSeconds: wodResultsTable.timeSeconds,
        rounds: wodResultsTable.rounds,
        reps: wodResultsTable.reps,
        level: wodResultsTable.level,
        notes: wodResultsTable.notes,
        createdAt: wodResultsTable.createdAt,
        sessionDate: wodOfDayTable.sessionDate,
        wodId: wodsTable.id,
        name: wodsTable.name,
        format: wodsTable.format,
      })
      .from(wodResultsTable)
      .innerJoin(wodOfDayTable, eq(wodOfDayTable.id, wodResultsTable.wodOfDayId))
      .innerJoin(wodsTable, eq(wodsTable.id, wodOfDayTable.wodId))
      .where(eq(wodResultsTable.userId, parsed.data.userId))
      .orderBy(desc(wodOfDayTable.sessionDate));

    res.json({ results: rows });
  } catch (error) {
    req.log.error({ err: error }, "Error loading WOD history");
    res.status(500).json({ error: "Failed to load history" });
  }
});

export default router;

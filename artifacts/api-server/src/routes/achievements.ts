import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

import { getAchievementsForUser } from "../lib/achievements/evaluate";
import { assertOwnsAccount } from "../lib/supabaseAuth";

const router: IRouter = Router();

const QuerySchema = z.object({ userId: z.string().min(1) });

/**
 * GET /achievements?userId=
 *
 * Evaluates all automatic achievement categories (Fase 1: constancia, PR,
 * comunidad, box, wodplace — MOVIMIENTO is Fase 2, coach-granted) against
 * current data, persists any newly-crossed thresholds, and returns every
 * category with its progress + full achievement list, plus Home's live
 * stats. See lib/achievements/evaluate.ts for the actual logic.
 */
router.get("/achievements", async (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;
  try {
    const result = await getAchievementsForUser(parsed.data.userId);
    res.json(result);
  } catch (error) {
    req.log.error({ err: error }, "Error evaluating achievements");
    res.status(500).json({ error: "Failed to load achievements" });
  }
});

export default router;

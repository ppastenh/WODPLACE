import {
  CreateMovementBody,
  CreateMovementResponse,
  CreatePrBody,
  CreatePrResponse,
  DeletePrGoalParams,
  DeletePrGoalQueryParams,
  DeletePrGoalResponse,
  DeletePrParams,
  DeletePrQueryParams,
  DeletePrResponse,
  GetTrainingSettingsQueryParams,
  GetTrainingSettingsResponse,
  ListMovementsQueryParams,
  ListMovementsResponse,
  ListPrGoalsQueryParams,
  ListPrGoalsResponse,
  ListPrsQueryParams,
  ListPrsResponse,
  UpdatePrBody,
  UpdatePrParams,
  UpdatePrResponse,
  UpsertPrGoalBody,
  UpsertPrGoalResponse,
  UpsertTrainingSettingsBody,
  UpsertTrainingSettingsResponse,
} from "@workspace/api-zod";
import {
  db,
  movementsTable,
  prGoalsTable,
  prsTable,
  trainingSettingsTable,
  type PlateSpec,
} from "@workspace/db";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

import { assertOwnsAccount } from "../lib/supabaseAuth";

const router: IRouter = Router();

const num = (v: string | number | null): number => Number(v ?? 0);

function serializePr(row: typeof prsTable.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    movementId: row.movementId,
    liftName: row.liftName,
    weight: num(row.weight),
    unit: row.unit,
    weightKg: num(row.weightKg),
    percentage: row.percentage == null ? null : num(row.percentage),
    achievedAt: row.achievedAt,
    note: row.notes,
  };
}

// ── movements ──────────────────────────────────────────────────────────────

router.get("/movements", async (req: Request, res: Response) => {
  const parsed = ListMovementsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;
  try {
    const rows = await db
      .select()
      .from(movementsTable)
      .where(
        or(
          isNull(movementsTable.createdBy),
          eq(movementsTable.createdBy, parsed.data.userId),
        ),
      )
      .orderBy(movementsTable.category, movementsTable.name);
    res.json(
      ListMovementsResponse.parse(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          isDefault: r.isDefault,
          createdBy: r.createdBy,
        })),
      ),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error listing movements");
    res.status(500).json({ error: "Failed to list movements" });
  }
});

router.post("/movements", async (req: Request, res: Response) => {
  const parsed = CreateMovementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }
  const { userId, name } = parsed.data;
  const category = parsed.data.category ?? null;
  if (!(await assertOwnsAccount(req, res, userId))) return;
  try {
    const [existing] = await db
      .select()
      .from(movementsTable)
      .where(
        and(
          sql`lower(${movementsTable.name}) = lower(${name})`,
          or(
            isNull(movementsTable.createdBy),
            eq(movementsTable.createdBy, userId),
          ),
        ),
      );
    if (existing) {
      res.json(
        CreateMovementResponse.parse({
          id: existing.id,
          name: existing.name,
          category: existing.category,
          isDefault: existing.isDefault,
          createdBy: existing.createdBy,
        }),
      );
      return;
    }
    const id = `mv_${crypto.randomUUID()}`;
    const [row] = await db
      .insert(movementsTable)
      .values({ id, name, category, isDefault: false, createdBy: userId })
      .returning();
    res.json(
      CreateMovementResponse.parse({
        id: row.id,
        name: row.name,
        category: row.category,
        isDefault: row.isDefault,
        createdBy: row.createdBy,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error creating movement");
    res.status(500).json({ error: "Failed to create movement" });
  }
});

// ── prs ────────────────────────────────────────────────────────────────────

router.get("/prs", async (req: Request, res: Response) => {
  const parsed = ListPrsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  const { userId, movementId } = parsed.data;
  if (!(await assertOwnsAccount(req, res, userId))) return;
  try {
    const where = movementId
      ? and(eq(prsTable.userId, userId), eq(prsTable.movementId, movementId))
      : eq(prsTable.userId, userId);
    const rows = await db
      .select()
      .from(prsTable)
      .where(where)
      .orderBy(desc(prsTable.achievedAt), desc(prsTable.createdAt));
    res.json(ListPrsResponse.parse(rows.map(serializePr)));
  } catch (error) {
    req.log.error({ err: error }, "Error listing prs");
    res.status(500).json({ error: "Failed to list records" });
  }
});

router.post("/prs", async (req: Request, res: Response) => {
  const parsed = CreatePrBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }
  const { id, userId, movementId, weight, unit } = parsed.data;
  if (!(await assertOwnsAccount(req, res, userId))) return;
  try {
    const [movement] = await db
      .select({ name: movementsTable.name })
      .from(movementsTable)
      .where(
        and(
          eq(movementsTable.id, movementId),
          or(
            isNull(movementsTable.createdBy),
            eq(movementsTable.createdBy, userId),
          ),
        ),
      );
    if (!movement) {
      res.status(400).json({ error: "Unknown movement" });
      return;
    }
    const [row] = await db
      .insert(prsTable)
      .values({
        id,
        userId,
        movementId,
        liftName: movement.name,
        weight: String(weight),
        unit,
        percentage:
          parsed.data.percentage == null
            ? null
            : String(parsed.data.percentage),
        ...(parsed.data.achievedAt
          ? { achievedAt: parsed.data.achievedAt }
          : {}),
        notes: parsed.data.note ?? null,
      })
      .returning();
    res.json(CreatePrResponse.parse(serializePr(row)));
  } catch (error) {
    req.log.error({ err: error }, "Error creating pr");
    res.status(500).json({ error: "Failed to save record" });
  }
});

router.patch("/prs/:id", async (req: Request, res: Response) => {
  const params = UpdatePrParams.safeParse(req.params);
  const body = UpdatePrBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, body.data.userId))) return;
  try {
    const set: Partial<typeof prsTable.$inferInsert> = {};
    if (body.data.weight != null) set.weight = String(body.data.weight);
    if (body.data.unit != null) set.unit = body.data.unit;
    if (body.data.percentage !== undefined)
      set.percentage =
        body.data.percentage == null ? null : String(body.data.percentage);
    if (body.data.achievedAt != null) set.achievedAt = body.data.achievedAt;
    if (body.data.note !== undefined) set.notes = body.data.note ?? null;

    const [row] = await db
      .update(prsTable)
      .set(set)
      .where(
        and(
          eq(prsTable.id, params.data.id),
          eq(prsTable.userId, body.data.userId),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Record not found" });
      return;
    }
    res.json(UpdatePrResponse.parse(serializePr(row)));
  } catch (error) {
    req.log.error({ err: error }, "Error updating pr");
    res.status(500).json({ error: "Failed to update record" });
  }
});

router.delete("/prs/:id", async (req: Request, res: Response) => {
  const params = DeletePrParams.safeParse(req.params);
  const query = DeletePrQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: "Missing id or userId" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, query.data.userId))) return;
  try {
    // userId in the WHERE, not just id — previously this deleted by id
    // alone, so anyone who knew/guessed a PR's id could delete any
    // athlete's record. Fixed alongside the Fase 4 ownership enforcement.
    const [row] = await db
      .delete(prsTable)
      .where(and(eq(prsTable.id, params.data.id), eq(prsTable.userId, query.data.userId)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Record not found" });
      return;
    }
    res.json(DeletePrResponse.parse({ ok: true }));
  } catch (error) {
    req.log.error({ err: error }, "Error deleting pr");
    res.status(500).json({ error: "Failed to delete record" });
  }
});

// ── pr-goals ───────────────────────────────────────────────────────────────

router.get("/pr-goals", async (req: Request, res: Response) => {
  const parsed = ListPrGoalsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;
  try {
    const rows = await db
      .select({
        id: prGoalsTable.id,
        userId: prGoalsTable.userId,
        movementId: prGoalsTable.movementId,
        targetWeight: prGoalsTable.targetWeight,
        targetUnit: prGoalsTable.targetUnit,
        targetWeightKg: prGoalsTable.targetWeightKg,
        achievedAt: prGoalsTable.achievedAt,
        currentBestKg: sql<string | null>`(
          SELECT max(${prsTable.weightKg}) FROM ${prsTable}
          WHERE ${prsTable.userId} = ${prGoalsTable.userId}
            AND ${prsTable.movementId} = ${prGoalsTable.movementId}
        )`,
      })
      .from(prGoalsTable)
      .where(eq(prGoalsTable.userId, parsed.data.userId));

    res.json(
      ListPrGoalsResponse.parse(
        rows.map((r) => {
          const best = r.currentBestKg == null ? null : num(r.currentBestKg);
          const targetKg = num(r.targetWeightKg);
          return {
            id: r.id,
            userId: r.userId,
            movementId: r.movementId,
            targetWeight: num(r.targetWeight),
            targetUnit: r.targetUnit,
            targetWeightKg: targetKg,
            achievedAt: r.achievedAt,
            currentBestKg: best,
            remainingKg: best == null ? null : Math.max(0, +(targetKg - best).toFixed(3)),
          };
        }),
      ),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error listing pr-goals");
    res.status(500).json({ error: "Failed to list goals" });
  }
});

router.put("/pr-goals", async (req: Request, res: Response) => {
  const parsed = UpsertPrGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }
  const { id, userId, movementId, targetWeight, targetUnit } = parsed.data;
  if (!(await assertOwnsAccount(req, res, userId))) return;
  try {
    const [row] = await db
      .insert(prGoalsTable)
      .values({
        id,
        userId,
        movementId,
        targetWeight: String(targetWeight),
        targetUnit,
      })
      .onConflictDoUpdate({
        target: [prGoalsTable.userId, prGoalsTable.movementId],
        set: {
          targetWeight: String(targetWeight),
          targetUnit,
          achievedAt: null,
        },
      })
      .returning();
    res.json(
      UpsertPrGoalResponse.parse({
        id: row.id,
        userId: row.userId,
        movementId: row.movementId,
        targetWeight: num(row.targetWeight),
        targetUnit: row.targetUnit,
        targetWeightKg: num(row.targetWeightKg),
        achievedAt: row.achievedAt,
        currentBestKg: null,
        remainingKg: null,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error upserting pr-goal");
    res.status(500).json({ error: "Failed to save goal" });
  }
});

router.delete("/pr-goals/:id", async (req: Request, res: Response) => {
  const params = DeletePrGoalParams.safeParse(req.params);
  const query = DeletePrGoalQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: "Missing id or userId" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, query.data.userId))) return;
  try {
    // Same fix as DELETE /prs/:id — userId in the WHERE, not just id.
    const [row] = await db
      .delete(prGoalsTable)
      .where(and(eq(prGoalsTable.id, params.data.id), eq(prGoalsTable.userId, query.data.userId)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.json(DeletePrGoalResponse.parse({ ok: true }));
  } catch (error) {
    req.log.error({ err: error }, "Error deleting pr-goal");
    res.status(500).json({ error: "Failed to delete goal" });
  }
});

// ── training-settings ──────────────────────────────────────────────────────

function serializeSettings(row: typeof trainingSettingsTable.$inferSelect) {
  return {
    userId: row.userId,
    preferredUnit: row.preferredUnit,
    barWeight: num(row.barWeight),
    barUnit: row.barUnit,
    bodyweightKg: row.bodyweightKg == null ? null : num(row.bodyweightKg),
    plates: (row.plates ?? []) as PlateSpec[],
  };
}

router.get("/training-settings", async (req: Request, res: Response) => {
  const parsed = GetTrainingSettingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!(await assertOwnsAccount(req, res, parsed.data.userId))) return;
  try {
    let [row] = await db
      .select()
      .from(trainingSettingsTable)
      .where(eq(trainingSettingsTable.userId, parsed.data.userId));
    if (!row) {
      [row] = await db
        .insert(trainingSettingsTable)
        .values({ userId: parsed.data.userId })
        .onConflictDoNothing()
        .returning();
      if (!row) {
        [row] = await db
          .select()
          .from(trainingSettingsTable)
          .where(eq(trainingSettingsTable.userId, parsed.data.userId));
      }
    }
    res.json(GetTrainingSettingsResponse.parse(serializeSettings(row)));
  } catch (error) {
    req.log.error({ err: error }, "Error reading training settings");
    res.status(500).json({ error: "Failed to read settings" });
  }
});

router.put("/training-settings", async (req: Request, res: Response) => {
  const parsed = UpsertTrainingSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }
  const { userId, preferredUnit, barWeight, barUnit, bodyweightKg, plates } = parsed.data;
  if (!(await assertOwnsAccount(req, res, userId))) return;
  try {
    // Genuine partial merge: a field the caller doesn't send is left exactly
    // as it is in the row, never reset to a default. Two different screens
    // (Ajustes, Discos disponibles) each only care about a subset of these
    // fields — a full-replace here previously let either one silently wipe
    // whatever the other left out (confirmed for bodyweightKg: neither
    // screen sends it, so touching bar weight or plates was nulling it out
    // every time).
    //
    // insertValues only needs the fields actually provided — Postgres
    // applies each column's own DEFAULT for the rest on first-ever creation,
    // same as before. updateSet is built the same way so onConflictDoUpdate
    // only touches the columns present in the request, leaving every other
    // column's current value untouched at the SQL level (no read-before-
    // write race).
    const insertValues: typeof trainingSettingsTable.$inferInsert = { userId, updatedAt: new Date() };
    const updateSet: Partial<typeof trainingSettingsTable.$inferInsert> = { updatedAt: new Date() };
    if (preferredUnit !== undefined) {
      insertValues.preferredUnit = preferredUnit;
      updateSet.preferredUnit = preferredUnit;
    }
    if (barWeight !== undefined) {
      insertValues.barWeight = String(barWeight);
      updateSet.barWeight = String(barWeight);
    }
    if (barUnit !== undefined) {
      insertValues.barUnit = barUnit;
      updateSet.barUnit = barUnit;
    }
    if (bodyweightKg !== undefined) {
      insertValues.bodyweightKg = bodyweightKg == null ? null : String(bodyweightKg);
      updateSet.bodyweightKg = bodyweightKg == null ? null : String(bodyweightKg);
    }
    if (plates !== undefined) {
      insertValues.plates = plates as PlateSpec[];
      updateSet.plates = plates as PlateSpec[];
    }

    const [row] = await db
      .insert(trainingSettingsTable)
      .values(insertValues)
      .onConflictDoUpdate({
        target: trainingSettingsTable.userId,
        set: updateSet,
      })
      .returning();
    res.json(UpsertTrainingSettingsResponse.parse(serializeSettings(row)));
  } catch (error) {
    req.log.error({ err: error }, "Error saving training settings");
    res.status(500).json({ error: "Failed to save settings" });
  }
});

export default router;

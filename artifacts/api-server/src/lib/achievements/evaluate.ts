import { db, prsTable, trainingSettingsTable, userAchievementsTable, wodplaceUsersTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

import { resolveBoxIdForAthlete } from "../boxContext";
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, type AchievementCategoryId } from "./catalog";

function makeId(): string {
  return `achv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / DAY_MS);
}

/**
 * Longest-ever run of consecutive calendar days with a confirmed booking,
 * plus the earliest date each streak length was first reached (so a badge's
 * unlockedAt reflects when it genuinely happened, not "whenever we happened
 * to evaluate"). Also returns the CURRENT streak (ending today or
 * yesterday — 0 if broken), used for Home's live stat, not for unlocking.
 */
function computeStreaks(sortedDates: string[]): {
  maxStreak: number;
  firstReachedAt: Map<number, string>;
  currentStreak: number;
} {
  const firstReachedAt = new Map<number, string>();
  let maxStreak = 0;
  let runStart = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    if (i > 0 && daysBetween(sortedDates[i - 1], sortedDates[i]) > 1) {
      runStart = i;
    }
    const length = i - runStart + 1;
    if (length > maxStreak) maxStreak = length;
    if (!firstReachedAt.has(length)) firstReachedAt.set(length, sortedDates[i]);
  }

  let currentStreak = 0;
  if (sortedDates.length > 0) {
    const today = toDateKey(new Date());
    const last = sortedDates[sortedDates.length - 1];
    const gap = daysBetween(last, today);
    if (gap <= 1) {
      currentStreak = 1;
      for (let i = sortedDates.length - 1; i > 0; i--) {
        if (daysBetween(sortedDates[i - 1], sortedDates[i]) === 1) currentStreak++;
        else break;
      }
    }
  }
  return { maxStreak, firstReachedAt, currentStreak };
}

type Candidate = { id: string; unlockedAt: Date };

async function confirmedBookingDates(userId: string): Promise<string[]> {
  const rows = await db.execute<{ session_date: string }>(sql`
    SELECT DISTINCT cs.session_date::text AS session_date
    FROM class_bookings cb
    JOIN class_sessions cs ON cs.id = cb.session_id
    WHERE cb.user_id = ${userId} AND cb.status = 'inscrito'
    ORDER BY session_date ASC
  `);
  return rows.rows.map((r) => r.session_date);
}

async function evaluateConstancia(userId: string, dates: string[]): Promise<Candidate[]> {
  const { firstReachedAt } = computeStreaks(dates);
  const thresholds: Array<[number, string]> = [
    [3, "constancia_3"],
    [7, "constancia_7"],
    [14, "constancia_14"],
    [30, "constancia_30"],
    [60, "constancia_60"],
    [100, "constancia_100"],
  ];
  const out: Candidate[] = [];
  for (const [n, id] of thresholds) {
    const reached = firstReachedAt.get(n) ?? [...firstReachedAt.entries()].find(([len]) => len >= n)?.[1];
    if (reached) out.push({ id, unlockedAt: new Date(`${reached}T00:00:00Z`) });
  }
  return out;
}

async function evaluateBoxAndWodplaceBookings(userId: string, dates: string[]): Promise<Candidate[]> {
  const out: Candidate[] = [];
  const at = (i: number) => new Date(`${dates[i]}T00:00:00Z`);
  if (dates.length >= 1) {
    out.push({ id: "box_welcome", unlockedAt: at(0) });
    out.push({ id: "wodplace_first_booking", unlockedAt: at(0) });
  }
  const milestones: Array<[number, string, string]> = [
    [10, "box_10", "wodplace_10_bookings"],
    [50, "box_50", "wodplace_50_bookings"],
    [100, "box_100", "wodplace_100_bookings"],
  ];
  for (const [n, boxId, wodplaceId] of milestones) {
    if (dates.length >= n) {
      out.push({ id: boxId, unlockedAt: at(n - 1) });
      out.push({ id: wodplaceId, unlockedAt: at(n - 1) });
    }
  }

  const boxId = await resolveBoxIdForAthlete(userId);
  if (boxId) {
    const rows = await db.execute<{ member_since: string | null; joined_at: string | null }>(sql`
      SELECT member_since::text, joined_at::text FROM box_members
      WHERE user_id = ${userId} AND box_id = ${boxId}
      LIMIT 1
    `);
    const row = rows.rows[0];
    const since = row?.member_since ?? row?.joined_at ?? null;
    if (since) {
      const sinceDate = new Date(`${since}T00:00:00Z`);
      const oneYear = new Date(sinceDate);
      oneYear.setUTCFullYear(oneYear.getUTCFullYear() + 1);
      const twoYears = new Date(sinceDate);
      twoYears.setUTCFullYear(twoYears.getUTCFullYear() + 2);
      const now = new Date();
      if (now >= oneYear) out.push({ id: "box_1_year", unlockedAt: oneYear });
      if (now >= twoYears) out.push({ id: "box_2_years", unlockedAt: twoYears });
    }
  }
  return out;
}

type PrRow = { movementId: string; weightKg: number; achievedAt: string };

async function evaluatePr(userId: string): Promise<{ candidates: Candidate[]; rows: PrRow[] }> {
  const raw = await db
    .select({
      movementId: prsTable.movementId,
      weightKg: prsTable.weightKg,
      achievedAt: prsTable.achievedAt,
      createdAt: prsTable.createdAt,
    })
    .from(prsTable)
    .where(eq(prsTable.userId, userId));

  const rows: PrRow[] = raw
    .map((r) => ({ movementId: r.movementId, weightKg: Number(r.weightKg ?? 0), achievedAt: r.achievedAt, createdAt: r.createdAt }))
    .sort((a, b) => (a.achievedAt === b.achievedAt ? a.createdAt.getTime() - b.createdAt.getTime() : a.achievedAt < b.achievedAt ? -1 : 1))
    .map(({ movementId, weightKg, achievedAt }) => ({ movementId, weightKg, achievedAt }));

  const out: Candidate[] = [];
  if (rows.length >= 1) out.push({ id: "pr_first", unlockedAt: new Date(`${rows[0].achievedAt}T00:00:00Z`) });
  const countMilestones: Array<[number, string]> = [[5, "pr_5"], [10, "pr_10"], [25, "pr_25"], [50, "pr_50"]];
  for (const [n, id] of countMilestones) {
    if (rows.length >= n) out.push({ id, unlockedAt: new Date(`${rows[n - 1].achievedAt}T00:00:00Z`) });
  }

  // Per-movement chronological analysis for break-ceiling / comeback / evolution.
  const byMovement = new Map<string, PrRow[]>();
  for (const r of rows) {
    const list = byMovement.get(r.movementId) ?? [];
    list.push(r);
    byMovement.set(r.movementId, list);
  }

  let breakCeiling: Date | null = null;
  let comeback30: Date | null = null;
  let comeback90: Date | null = null;
  const evolutionDates = { 10: null as Date | null, 20: null as Date | null, 30: null as Date | null };

  for (const list of byMovement.values()) {
    if (list.length === 0) continue;
    const first = list[0].weightKg;
    let runningMax = first;
    for (let i = 1; i < list.length; i++) {
      const cur = list[i];
      const improved = cur.weightKg > runningMax;
      if (improved) {
        const d = new Date(`${cur.achievedAt}T00:00:00Z`);
        if (!breakCeiling || d < breakCeiling) breakCeiling = d;

        const gap = daysBetween(list[i - 1].achievedAt, cur.achievedAt);
        if (gap >= 90 && (!comeback90 || d < comeback90)) comeback90 = d;
        if (gap >= 30 && (!comeback30 || d < comeback30)) comeback30 = d;

        runningMax = cur.weightKg;
      }
    }
    if (first > 0) {
      const best = Math.max(first, ...list.map((r) => r.weightKg));
      for (const pct of [10, 20, 30] as const) {
        if (best >= first * (1 + pct / 100)) {
          const hit = list.find((r) => r.weightKg >= first * (1 + pct / 100));
          if (hit) {
            const d = new Date(`${hit.achievedAt}T00:00:00Z`);
            if (!evolutionDates[pct] || d < evolutionDates[pct]!) evolutionDates[pct] = d;
          }
        }
      }
    }
  }

  if (breakCeiling) out.push({ id: "pr_break_ceiling", unlockedAt: breakCeiling });
  if (comeback30) out.push({ id: "pr_comeback_30", unlockedAt: comeback30 });
  if (comeback90) out.push({ id: "pr_comeback_90", unlockedAt: comeback90 });
  if (evolutionDates[10]) out.push({ id: "pr_evolution_10", unlockedAt: evolutionDates[10]! });
  if (evolutionDates[20]) out.push({ id: "pr_evolution_20", unlockedAt: evolutionDates[20]! });
  if (evolutionDates[30]) out.push({ id: "pr_evolution_30", unlockedAt: evolutionDates[30]! });

  if (rows.length >= 1) out.push({ id: "wodplace_first_pr", unlockedAt: new Date(`${rows[0].achievedAt}T00:00:00Z`) });

  return { candidates: out, rows };
}

// Movement ids from the RM module's own catalog (supabase/migrations/
// 20260902120000_rm_module.sql) — real values, not this file's achievement
// ids.
const BW_LIFTS: Array<{ movementId: string; prefix: string }> = [
  { movementId: "back-squat", prefix: "movimiento_back_squat" },
  { movementId: "front-squat", prefix: "movimiento_front_squat" },
  { movementId: "deadlift", prefix: "movimiento_deadlift" },
];
const BW_TIERS: Array<[number, string]> = [
  [1, "1x"],
  [1.5, "1_5x"],
  [2, "2x"],
];

/**
 * The 9 bodyweight-relative MOVIMIENTO achievements (Fase 3) — reuses the PR
 * rows evaluatePr() already fetched (no extra query for those) and reads the
 * athlete's self-reported bodyweight from training_settings. No historical
 * bodyweight tracking exists, so this always compares against today's
 * bodyweight against the full lift history — see this feature's own plan
 * for why that's an accepted simplification. Null bodyweight (never set) or
 * no PRs yet for a given lift just means those achievements stay locked,
 * same "missing data" convention as every other category.
 */
async function evaluateBodyweightLifts(userId: string, rows: PrRow[]): Promise<Candidate[]> {
  const [settings] = await db
    .select({ bodyweightKg: trainingSettingsTable.bodyweightKg })
    .from(trainingSettingsTable)
    .where(eq(trainingSettingsTable.userId, userId));
  const bodyweightKg = settings?.bodyweightKg == null ? null : Number(settings.bodyweightKg);
  if (bodyweightKg == null || bodyweightKg <= 0) return [];

  const out: Candidate[] = [];
  for (const { movementId, prefix } of BW_LIFTS) {
    const lifts = rows
      .filter((r) => r.movementId === movementId)
      .sort((a, b) => (a.achievedAt < b.achievedAt ? -1 : a.achievedAt > b.achievedAt ? 1 : 0));
    if (lifts.length === 0) continue;

    for (const [multiplier, suffix] of BW_TIERS) {
      const threshold = bodyweightKg * multiplier;
      const hit = lifts.find((l) => l.weightKg >= threshold);
      if (hit) out.push({ id: `${prefix}_${suffix}`, unlockedAt: new Date(`${hit.achievedAt}T00:00:00Z`) });
    }
  }
  return out;
}

async function evaluateComunidad(userId: string): Promise<Candidate[]> {
  const [posts, comments, reactions] = await Promise.all([
    db.execute<{ created_at: string }>(sql`SELECT created_at::text FROM social_posts WHERE user_id = ${userId} AND deleted_at IS NULL`),
    db.execute<{ created_at: string }>(sql`SELECT created_at::text FROM social_comments WHERE user_id = ${userId} AND deleted_at IS NULL`),
    db.execute<{ created_at: string }>(sql`SELECT created_at::text FROM social_reactions WHERE user_id = ${userId}`),
  ]);

  const out: Candidate[] = [];
  if (posts.rows[0]) out.push({ id: "community_first_post", unlockedAt: new Date(posts.rows[0].created_at) });
  if (comments.rows[0]) out.push({ id: "community_first_comment", unlockedAt: new Date(comments.rows[0].created_at) });
  if (reactions.rows[0]) out.push({ id: "community_first_like", unlockedAt: new Date(reactions.rows[0].created_at) });

  const all = [...posts.rows, ...comments.rows, ...reactions.rows]
    .map((r) => new Date(r.created_at))
    .sort((a, b) => a.getTime() - b.getTime());
  if (all.length >= 10) out.push({ id: "community_10", unlockedAt: all[9] });
  if (all.length >= 50) out.push({ id: "community_50", unlockedAt: all[49] });

  return out;
}

async function evaluateWodplaceProfile(userId: string): Promise<Candidate[]> {
  const [user] = await db.select().from(wodplaceUsersTable).where(eq(wodplaceUsersTable.id, userId));
  if (!user) return [];
  const out: Candidate[] = [];
  if (user.avatarUrl) out.push({ id: "wodplace_first_photo", unlockedAt: new Date() });
  if (user.avatarUrl && user.phrase && user.rank && user.birthdate) {
    out.push({ id: "wodplace_complete_profile", unlockedAt: new Date() });
  }
  return out;
}

export type AchievementView = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
};

export type AchievementsResponse = {
  categories: Array<{
    id: AchievementCategoryId;
    name: string;
    unlocked: number;
    total: number;
    achievements: AchievementView[];
  }>;
  stats: {
    totalBookings: number;
    currentStreakDays: number;
    featuredPr: { movementId: string; liftName: string; weightKg: number; improvementPct: number } | null;
    phrase: string | null;
  };
};

/**
 * Evaluates every automatic category against current data, persists any
 * newly-crossed thresholds (idempotent — ON CONFLICT DO NOTHING via the
 * user_id+achievement_id unique index), and returns the full unlocked/locked
 * state for every achievement plus Home's live stats. Lazy: runs whenever
 * the caller (the Medallas screen, Home) asks — no event wiring into
 * bookings/rm/social routes.
 */
export async function getAchievementsForUser(userId: string): Promise<AchievementsResponse> {
  const dates = await confirmedBookingDates(userId);
  const [constancia, boxAndWodplaceBookings, prResult, comunidad, wodplaceProfile] = await Promise.all([
    evaluateConstancia(userId, dates),
    evaluateBoxAndWodplaceBookings(userId, dates),
    evaluatePr(userId),
    evaluateComunidad(userId),
    evaluateWodplaceProfile(userId),
  ]);
  // Depends on prResult.rows, so it can't join the Promise.all above.
  const bodyweightLifts = await evaluateBodyweightLifts(userId, prResult.rows);

  const allCandidates = [
    ...constancia,
    ...boxAndWodplaceBookings,
    ...prResult.candidates,
    ...comunidad,
    ...wodplaceProfile,
    ...bodyweightLifts,
  ];

  const existing = await db
    .select({ achievementId: userAchievementsTable.achievementId, unlockedAt: userAchievementsTable.unlockedAt })
    .from(userAchievementsTable)
    .where(eq(userAchievementsTable.userId, userId));
  const existingIds = new Set(existing.map((e) => e.achievementId));

  const toInsert = allCandidates.filter((c) => !existingIds.has(c.id));
  if (toInsert.length > 0) {
    await db
      .insert(userAchievementsTable)
      .values(
        toInsert.map((c) => ({
          id: makeId(),
          userId,
          achievementId: c.id,
          unlockedAt: c.unlockedAt,
        })),
      )
      .onConflictDoNothing();
  }

  const unlockedAtById = new Map<string, Date>();
  for (const e of existing) unlockedAtById.set(e.achievementId, e.unlockedAt);
  for (const c of toInsert) unlockedAtById.set(c.id, c.unlockedAt);

  const categories = ACHIEVEMENT_CATEGORIES.map((cat) => {
    const defs = ACHIEVEMENTS.filter((a) => a.category === cat.id);
    const achievements: AchievementView[] = defs.map((d) => {
      const unlockedAt = unlockedAtById.get(d.id) ?? null;
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        icon: d.icon,
        unlocked: unlockedAt != null,
        unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
      };
    });
    return {
      id: cat.id,
      name: cat.name,
      unlocked: achievements.filter((a) => a.unlocked).length,
      total: achievements.length,
      achievements,
    };
  }).filter((c) => c.total > 0);

  // Featured PR for Home: the movement with the largest % jump between its
  // two most recent entries; falls back to the single most recent PR when no
  // movement has 2+ entries to compare.
  let featuredPr: AchievementsResponse["stats"]["featuredPr"] = null;
  {
    const byMovement = new Map<string, PrRow[]>();
    for (const r of prResult.rows) {
      const list = byMovement.get(r.movementId) ?? [];
      list.push(r);
      byMovement.set(r.movementId, list);
    }
    let best: { movementId: string; weightKg: number; pct: number } | null = null;
    for (const [movementId, list] of byMovement) {
      if (list.length < 2) continue;
      const prev = list[list.length - 2].weightKg;
      const latest = list[list.length - 1].weightKg;
      if (prev <= 0) continue;
      const pct = ((latest - prev) / prev) * 100;
      if (!best || pct > best.pct) best = { movementId, weightKg: latest, pct };
    }
    if (best) {
      const liftRow = await db
        .select({ liftName: prsTable.liftName })
        .from(prsTable)
        .where(and(eq(prsTable.userId, userId), eq(prsTable.movementId, best.movementId)))
        .limit(1);
      featuredPr = { movementId: best.movementId, liftName: liftRow[0]?.liftName ?? best.movementId, weightKg: best.weightKg, improvementPct: Math.round(best.pct) };
    } else if (prResult.rows.length > 0) {
      const last = prResult.rows[prResult.rows.length - 1];
      const liftRow = await db
        .select({ liftName: prsTable.liftName })
        .from(prsTable)
        .where(and(eq(prsTable.userId, userId), eq(prsTable.movementId, last.movementId)))
        .limit(1);
      featuredPr = { movementId: last.movementId, liftName: liftRow[0]?.liftName ?? last.movementId, weightKg: last.weightKg, improvementPct: 0 };
    }
  }

  const [user] = await db.select({ phrase: wodplaceUsersTable.phrase }).from(wodplaceUsersTable).where(eq(wodplaceUsersTable.id, userId));

  return {
    categories,
    stats: {
      totalBookings: dates.length,
      currentStreakDays: computeStreaks(dates).currentStreak,
      featuredPr,
      phrase: user?.phrase ?? null,
    },
  };
}

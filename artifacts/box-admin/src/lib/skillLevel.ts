/**
 * Same 6-level scale as wodplace's shared skillLevel.ts (lib/api-client-
 * react/src/skillLevel.ts) — box-admin has no shared package with that app,
 * so this is its own standalone copy (same pattern as movementAchievements.ts).
 * Values MUST match exactly: it's what a coach assigns here that ends up in
 * wodplace_users.rank, which wodplace also uses as the default level for a
 * logged WOD result.
 */
export const SKILL_LEVELS = ["beginner", "rookie", "scaled", "master", "rx", "elite"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: "Beginner",
  rookie: "Rookie",
  scaled: "Scaled",
  master: "Master",
  rx: "RX",
  elite: "Elite",
};

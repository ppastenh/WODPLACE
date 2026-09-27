/**
 * Shared 6-level skill scale — used both as an athlete's assigned level
 * (wodplace_users.rank, coach-assigned from box-admin) and as the level a
 * WOD result was logged at (wod_results.level). Unified into one scale on
 * purpose (see supabase/migrations/..._unify_skill_level_scale.sql) so an
 * athlete's assigned level can double as their default WOD result level
 * with no mapping table needed.
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

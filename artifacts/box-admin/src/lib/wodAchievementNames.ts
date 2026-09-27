/**
 * Display names for the WOD-category automatic achievements that can carry
 * a `source_wod_result_id` (see supabase/migrations/
 * ..._user_achievements_source_wod_result.sql) — used only to preview which
 * medals will be removed when an admin deletes a specific wod_result in
 * member-detail.$id.tsx's "WODs" tab. Not the full WOD catalog (no
 * wod_beast_mode: it isn't tied to a single result, so it's never revocable
 * this way) and ids MUST match api-server's lib/achievements/catalog.ts
 * exactly, same constraint as movementAchievements.ts/competitionAchievements.ts.
 */
export const WOD_ACHIEVEMENT_NAMES: Record<string, string> = {
  wod_count_1: "Primer WOD",
  wod_count_10: "10 WODs",
  wod_count_25: "25 WODs",
  wod_count_50: "50 WODs",
  wod_count_100: "100 WODs",
  wod_count_250: "250 WODs",
  wod_count_500: "500 WODs",
  wod_level_beginner: "Nivel Beginner",
  wod_level_rookie: "Nivel Rookie",
  wod_level_scaled: "Nivel Scaled",
  wod_level_master: "Nivel Master",
  wod_level_rx: "Nivel RX",
  wod_level_elite: "Nivel Elite",
  wod_improve: "Mejora tu tiempo",
  wod_hero_fran: "Fran",
  wod_hero_grace: "Grace",
  wod_hero_helen: "Helen",
  wod_hero_isabel: "Isabel",
  wod_hero_diane: "Diane",
  wod_hero_annie: "Annie",
  wod_hero_nancy: "Nancy",
  wod_hero_karen: "Karen",
  "wod_hero_fight-gone-bad": "Fight Gone Bad",
  wod_hero_murph: "Murph",
  wod_hero_chad: "Chad",
  wod_hero_dt: "DT",
  wod_hero_cindy: "Cindy",
  wod_hero_angie: "Angie",
  wod_hero_barbara: "Barbara",
  wod_hero_chelsea: "Chelsea",
  wod_hero_elizabeth: "Elizabeth",
  wod_hero_linda: "Linda",
  wod_hero_kalsu: "Kalsu",
};

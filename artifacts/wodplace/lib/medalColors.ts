/**
 * Per-achievement icon color overrides — only the 3 COMPETENCIA podium
 * medals need this (gold/silver/bronze trophy), everything else uses
 * MedalBadge's default copper/gray. Keyed by achievement id so callers
 * (medallas.tsx, home.tsx) just look it up, no special-casing at the call
 * site beyond passing the result through.
 */
const MEDAL_ICON_COLOR_OVERRIDES: Record<string, string> = {
  competencia_first_place: '#D4AF37', // gold
  competencia_second_place: '#A8ADB4', // silver
  competencia_third_place: '#B5722E', // bronze
};

export function getMedalIconColor(achievementId: string): string | undefined {
  return MEDAL_ICON_COLOR_OVERRIDES[achievementId];
}

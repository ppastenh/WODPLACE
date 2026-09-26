/**
 * MOVIMIENTO achievement catalog (Fase 2) — coach-granted skill/lift badges.
 * box-admin has no shared package with api-server, so this list is kept here
 * standalone; its `id`s MUST match api-server's
 * lib/achievements/catalog.ts ACHIEVEMENTS entries with category
 * "movimiento" exactly, or a granted badge won't show up right (name/icon)
 * in wodplace's Medallas screen. Only the id+name are needed here — the
 * name/description/icon shown to the athlete live in that other file.
 *
 * Excludes the bodyweight-relative tiers (back/front squat, deadlift ×
 * 1x/1.5x/2x) — those are Fase 3, computed automatically once a bodyweight
 * field exists, not coach-toggled.
 */
export type MovementAchievement = { id: string; name: string; group: "gimnasia" | "levantamiento" };

export const MOVEMENT_ACHIEVEMENTS: MovementAchievement[] = [
  // Gimnasia
  { id: "movimiento_pullup", name: "Primera dominada", group: "gimnasia" },
  { id: "movimiento_strict_pullup", name: "Dominada estricta", group: "gimnasia" },
  { id: "movimiento_bar_muscle_up", name: "Muscle-up en barra", group: "gimnasia" },
  { id: "movimiento_ring_muscle_up", name: "Muscle-up en anillas", group: "gimnasia" },
  { id: "movimiento_double_under", name: "Doble salto", group: "gimnasia" },
  { id: "movimiento_triple_under", name: "Triple salto", group: "gimnasia" },
  { id: "movimiento_handstand", name: "Parada de manos", group: "gimnasia" },
  { id: "movimiento_hspu", name: "Flexión de pino", group: "gimnasia" },
  { id: "movimiento_pistol_squat", name: "Pistol squat", group: "gimnasia" },
  { id: "movimiento_rope_climb", name: "Subida de cuerda", group: "gimnasia" },
  { id: "movimiento_toes_to_bar", name: "Toes to bar", group: "gimnasia" },
  { id: "movimiento_chest_to_bar", name: "Chest to bar", group: "gimnasia" },
  // Levantamientos
  { id: "movimiento_snatch", name: "Primer snatch", group: "levantamiento" },
  { id: "movimiento_clean", name: "Primer clean", group: "levantamiento" },
  { id: "movimiento_clean_and_jerk", name: "Clean & Jerk", group: "levantamiento" },
  { id: "movimiento_power_clean", name: "Power clean", group: "levantamiento" },
  { id: "movimiento_power_snatch", name: "Power snatch", group: "levantamiento" },
  { id: "movimiento_squat_clean", name: "Squat clean", group: "levantamiento" },
  { id: "movimiento_squat_snatch", name: "Squat snatch", group: "levantamiento" },
  { id: "movimiento_jerk", name: "Primer jerk", group: "levantamiento" },
  { id: "movimiento_split_jerk", name: "Split jerk", group: "levantamiento" },
  { id: "movimiento_push_jerk", name: "Push jerk", group: "levantamiento" },
  { id: "movimiento_overhead_squat", name: "Overhead squat", group: "levantamiento" },
  { id: "movimiento_back_squat", name: "Back squat", group: "levantamiento" },
  { id: "movimiento_front_squat", name: "Front squat", group: "levantamiento" },
  { id: "movimiento_deadlift", name: "Deadlift", group: "levantamiento" },
  { id: "movimiento_bench_press", name: "Bench press", group: "levantamiento" },
  { id: "movimiento_strict_press", name: "Strict press", group: "levantamiento" },
  { id: "movimiento_push_press", name: "Push press", group: "levantamiento" },
];

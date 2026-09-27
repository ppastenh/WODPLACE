/**
 * COMPETENCIA achievement catalog — coach-granted, same pattern as
 * MOVIMIENTO (movementAchievements.ts): no event-management system, just
 * manual badges. box-admin has no shared package with api-server, so this
 * list is kept here standalone; its `id`s MUST match api-server's
 * lib/achievements/catalog.ts ACHIEVEMENTS entries with category
 * "competencia" exactly, or a granted badge won't show up right (name/icon)
 * in wodplace's Medallas screen. Only id+name are needed here — name/
 * description/icon shown to the athlete live in that other file.
 *
 * The 3/5/10-competition milestones are 3 separate toggles (competencia_
 * count_3/5/10), not a counter field — same manual-checkbox mechanism as
 * everything else here, no new data model needed.
 */
export type CompetitionAchievement = { id: string; name: string; group: "resultados" | "categoría" };

export const COMPETITION_ACHIEVEMENTS: CompetitionAchievement[] = [
  { id: "competencia_first", name: "Primera competencia", group: "resultados" },
  { id: "competencia_podium", name: "Primer podio", group: "resultados" },
  { id: "competencia_first_place", name: "Primer 1er lugar", group: "resultados" },
  { id: "competencia_second_place", name: "Primer 2do lugar", group: "resultados" },
  { id: "competencia_third_place", name: "Primer 3er lugar", group: "resultados" },
  { id: "competencia_recurring", name: "Competidor recurrente", group: "resultados" },
  { id: "competencia_count_3", name: "3 competencias", group: "resultados" },
  { id: "competencia_count_5", name: "5 competencias", group: "resultados" },
  { id: "competencia_count_10", name: "10 competencias", group: "resultados" },
  { id: "competencia_category_beginner", name: "Compitió en categoría Beginner", group: "categoría" },
  { id: "competencia_category_rookie", name: "Compitió en categoría Rookie", group: "categoría" },
  { id: "competencia_category_scaled", name: "Compitió en categoría Scaled", group: "categoría" },
  { id: "competencia_category_master", name: "Compitió en categoría Master", group: "categoría" },
  { id: "competencia_category_rx", name: "Compitió en categoría RX", group: "categoría" },
  { id: "competencia_category_elite", name: "Compitió en categoría Elite", group: "categoría" },
];

/**
 * Fixed, curated list of achievements — a design decision, not user data, so
 * it lives in code rather than a database table (same reasoning as
 * DAILY_QUOTES/PERMISSIONS-style constants elsewhere in this codebase).
 * `user_achievements` only records WHO unlocked WHAT and WHEN; this file is
 * the single source of truth for names/descriptions/category structure.
 *
 * `icon` is a Feather icon name (@expo/vector-icons/Feather, the icon set
 * wodplace already uses everywhere else) — kept as a plain string here so
 * this file has no dependency on any UI library; the client renders it
 * directly (`<Feather name={a.icon} />`).
 *
 * Fase 1 covers 5 automatic categories (evaluate.ts computes all of these
 * from data that already exists: bookings, PRs, Comunidad, box tenure, app
 * usage). MOVIMIENTO (coach-granted skill/lift badges) is Fase 2 — its
 * category id is reserved here but has no achievements yet, so it simply
 * won't appear in GET /achievements' response until Fase 2 adds entries.
 */

export type AchievementCategoryId =
  | "movimiento"
  | "constancia"
  | "pr"
  | "comunidad"
  | "box"
  | "wodplace";

export type AchievementDef = {
  id: string;
  category: AchievementCategoryId;
  name: string;
  description: string;
  /** Feather icon name — see this file's own doc comment. */
  icon: string;
  /** Automatic ones are unlocked by evaluate.ts from existing data; manual
   *  ones (Fase 2) are granted by a coach in box-admin. */
  kind: "automatic" | "manual";
};

export const ACHIEVEMENT_CATEGORIES: Array<{ id: AchievementCategoryId; name: string }> = [
  { id: "movimiento", name: "Movimiento" },
  { id: "constancia", name: "Constancia" },
  { id: "pr", name: "PR" },
  { id: "comunidad", name: "Comunidad" },
  { id: "box", name: "Box" },
  { id: "wodplace", name: "WODPLACE" },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── CONSTANCIA — rachas de días consecutivos reservando clases ────────────
  { id: "constancia_3", category: "constancia", kind: "automatic", icon: "zap", name: "Racha de hierro", description: "Entrená 3 días seguidos." },
  { id: "constancia_7", category: "constancia", kind: "automatic", icon: "calendar", name: "Sin excusas", description: "Entrená 7 días seguidos." },
  { id: "constancia_14", category: "constancia", kind: "automatic", icon: "shield", name: "Disciplina", description: "Entrená 14 días seguidos." },
  { id: "constancia_30", category: "constancia", kind: "automatic", icon: "trending-up", name: "Imparable", description: "Entrená 30 días seguidos." },
  { id: "constancia_60", category: "constancia", kind: "automatic", icon: "award", name: "Leyenda de la constancia", description: "Entrená 60 días seguidos." },
  { id: "constancia_100", category: "constancia", kind: "automatic", icon: "star", name: "Inquebrantable", description: "Entrená 100 días seguidos." },

  // ── PR — integrado con el módulo de RM ────────────────────────────────────
  { id: "pr_first", category: "pr", kind: "automatic", icon: "flag", name: "Primer PR", description: "Registrá tu primer PR." },
  { id: "pr_5", category: "pr", kind: "automatic", icon: "bar-chart-2", name: "5 PRs", description: "Registrá 5 PRs." },
  { id: "pr_10", category: "pr", kind: "automatic", icon: "bar-chart-2", name: "10 PRs", description: "Registrá 10 PRs." },
  { id: "pr_25", category: "pr", kind: "automatic", icon: "bar-chart-2", name: "25 PRs", description: "Registrá 25 PRs." },
  { id: "pr_50", category: "pr", kind: "automatic", icon: "bar-chart-2", name: "50 PRs", description: "Registrá 50 PRs." },
  { id: "pr_break_ceiling", category: "pr", kind: "automatic", icon: "arrow-up-circle", name: "Rompe tu techo", description: "Superá tu propio récord anterior en un movimiento." },
  { id: "pr_comeback_30", category: "pr", kind: "automatic", icon: "refresh-cw", name: "Segundo aire", description: "Lográ un PR después de 30 días sin mejorar ese movimiento." },
  { id: "pr_comeback_90", category: "pr", kind: "automatic", icon: "refresh-cw", name: "Resurgimiento", description: "Lográ un PR después de 90 días sin mejorar ese movimiento." },
  { id: "pr_evolution_10", category: "pr", kind: "automatic", icon: "trending-up", name: "Evolución +10%", description: "Mejorá un 10% tu primer registro de un movimiento." },
  { id: "pr_evolution_20", category: "pr", kind: "automatic", icon: "trending-up", name: "Evolución +20%", description: "Mejorá un 20% tu primer registro de un movimiento." },
  { id: "pr_evolution_30", category: "pr", kind: "automatic", icon: "trending-up", name: "Evolución +30%", description: "Mejorá un 30% tu primer registro de un movimiento." },

  // ── COMUNIDAD ──────────────────────────────────────────────────────────────
  { id: "community_first_like", category: "comunidad", kind: "automatic", icon: "heart", name: "Primer like", description: "Dale like a un post por primera vez." },
  { id: "community_first_comment", category: "comunidad", kind: "automatic", icon: "message-circle", name: "Primer comentario", description: "Comentá un post por primera vez." },
  { id: "community_first_post", category: "comunidad", kind: "automatic", icon: "edit-3", name: "Primer post", description: "Publicá tu primer post en Comunidad." },
  { id: "community_10", category: "comunidad", kind: "automatic", icon: "users", name: "10 interacciones", description: "Sumá 10 likes, comentarios o posts." },
  { id: "community_50", category: "comunidad", kind: "automatic", icon: "users", name: "50 interacciones", description: "Sumá 50 likes, comentarios o posts." },

  // ── BOX — antigüedad y entrenamientos en tu box ───────────────────────────
  { id: "box_welcome", category: "box", kind: "automatic", icon: "home", name: "Bienvenido al Box", description: "Completá tu primer entrenamiento." },
  { id: "box_10", category: "box", kind: "automatic", icon: "map-pin", name: "10 entrenamientos", description: "Entrená 10 veces." },
  { id: "box_50", category: "box", kind: "automatic", icon: "map-pin", name: "50 entrenamientos", description: "Entrená 50 veces." },
  { id: "box_100", category: "box", kind: "automatic", icon: "award", name: "Local Legend", description: "Entrená 100 veces." },
  { id: "box_1_year", category: "box", kind: "automatic", icon: "clock", name: "Veterano", description: "Cumplí 1 año en el box." },
  { id: "box_2_years", category: "box", kind: "automatic", icon: "shield", name: "Pilar del Box", description: "Cumplí 2 años en el box." },

  // ── WODPLACE — uso de la app ───────────────────────────────────────────────
  { id: "wodplace_complete_profile", category: "wodplace", kind: "automatic", icon: "user-check", name: "Perfil completo", description: "Completá tu foto, frase, rango y fecha de nacimiento." },
  { id: "wodplace_first_photo", category: "wodplace", kind: "automatic", icon: "camera", name: "Primera foto", description: "Subí tu foto de perfil." },
  { id: "wodplace_first_pr", category: "wodplace", kind: "automatic", icon: "flag", name: "Primer PR registrado", description: "Registrá tu primer PR en la app." },
  { id: "wodplace_first_booking", category: "wodplace", kind: "automatic", icon: "calendar", name: "Primera reserva", description: "Reservá tu primera clase." },
  { id: "wodplace_10_bookings", category: "wodplace", kind: "automatic", icon: "check-circle", name: "10 reservas", description: "Reservá 10 clases." },
  { id: "wodplace_50_bookings", category: "wodplace", kind: "automatic", icon: "check-circle", name: "50 reservas", description: "Reservá 50 clases." },
  { id: "wodplace_100_bookings", category: "wodplace", kind: "automatic", icon: "check-circle", name: "100 reservas", description: "Reservá 100 clases." },
];

export function achievementsByCategory(category: AchievementCategoryId): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

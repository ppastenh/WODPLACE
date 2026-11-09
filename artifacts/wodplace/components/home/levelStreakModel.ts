/**
 * Lógica PURA de los recuadros "Tu nivel" y "Racha de constancia" de Inicio (decisión (w) de DECISIONES-DISENO.md). Sin React: la dibuja LevelStreakCards.tsx.
 * No decide nada nuevo: solo da forma al rango (user.rank) y al número de días seguidos (GET /achievements, stats.currentStreakDays) que ya llegan a HomeView.
 */

/**
 * Copia local de SKILL_LEVEL_LABELS (lib/api-client-react/src/skillLevel.ts): un import de valores desde la API no pasa la frontera del diseño.
 * DEBE MANTENERSE IGUAL a la de la librería (la base solo permite estos 6 valores). Una prueba de coincidencia queda para el chat de seguridad.
 */
export const SKILL_LEVEL_LABELS = {
  beginner: 'Beginner',
  rookie: 'Rookie',
  scaled: 'Scaled',
  master: 'Master',
  rx: 'RX',
  elite: 'Elite',
} as const satisfies Record<string, string>;

/** Cantidad de indicadores de la racha: un progreso visual hasta siete (NO son días de la semana: el cliente solo recibe el número). */
export const STREAK_DOTS = 7;

export type StreakView =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'streak'; days: number; filled: number };

/**
 * Estado del recuadro de racha. `null` = todavía cargando (HomeView entrega `achievementsQuery.data?.stats ?? null`): esqueleto, nunca "0 / Empieza hoy".
 * Sin racha (0, vacío o un valor no válido) = vacío; con racha, `filled` = min(días, 7).
 */
export function streakView(stats: { currentStreakDays?: number | null } | null): StreakView {
  if (stats === null) return { kind: 'loading' };
  const days = stats.currentStreakDays;
  if (typeof days !== 'number' || !Number.isFinite(days) || days < 1) return { kind: 'empty' };
  const whole = Math.floor(days);
  return { kind: 'streak', days: whole, filled: Math.min(whole, STREAK_DOTS) };
}

/** "día seguido" / "días seguidos". */
export function streakSuffix(days: number): string {
  return days === 1 ? 'día seguido' : 'días seguidos';
}

/** Frase completa del recuadro de racha para lectores de pantalla (incluye los siete indicadores, que no se leen sueltos). */
export function streakA11yLabel(view: StreakView): string {
  if (view.kind === 'loading') return 'Racha de constancia: cargando';
  if (view.kind === 'empty') return 'Racha de constancia: empieza hoy';
  return `Racha de constancia: ${view.days} ${streakSuffix(view.days)}`;
}

export type LevelView = { kind: 'rank'; label: string } | { kind: 'none' };

/** Texto del rango; un valor vacío o desconocido se muestra tal cual si trae texto, y "Sin rango" si no trae nada. */
export function levelView(rank: string | null | undefined): LevelView {
  if (!rank) return { kind: 'none' };
  const label = (SKILL_LEVEL_LABELS as Record<string, string>)[rank] ?? rank;
  return { kind: 'rank', label };
}

export const NO_RANK_LABEL = 'Sin rango';
export const LEVEL_DETAIL = 'Sigue avanzando';

export function levelText(view: LevelView): string {
  return view.kind === 'rank' ? view.label : NO_RANK_LABEL;
}

/** Frase completa del recuadro de nivel, p. ej. "Tu nivel: Beginner. Sigue avanzando". */
export function levelA11yLabel(view: LevelView): string {
  return `Tu nivel: ${levelText(view)}. ${LEVEL_DETAIL}`;
}

/**
 * Tamaño del rango por tramos según el largo (SIN adjustsFontSizeToFit, que no es fiable en Android): hasta 6 letras ("RX", "Elite", "Rookie", "Scaled", "Master")
 * van al tamaño completo; de 7 en adelante ("Beginner", "Sin rango" o un valor largo) bajan un tramo y de 10 en adelante otro. Los tamaños se miden en desarrollo.
 */
export function rankFontSize(text: string, full: number): number {
  const len = text.length;
  if (len <= 6) return full;
  if (len <= 9) return Math.round(full * 0.82);
  return Math.round(full * 0.68);
}

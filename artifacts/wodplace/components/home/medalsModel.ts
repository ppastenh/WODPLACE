/**
 * Lógica PURA de la tarjeta "Medallas" de Inicio (decisión (y), Copper Achievement). Sin React: la dibuja MedalsCard.tsx.
 * No decide nada nuevo: los números (N desbloqueadas, M totales) y la lista de las últimas medallas ya los calcula app/home.tsx (medalsSummary) a partir de GET /achievements;
 * "la última" es la primera de esa lista, ordenada por fecha de desbloqueo (unlockedAt) de la más nueva a la más vieja.
 */

/** Estado de la consulta de logros (la misma que la racha: home.tsx entrega streakStatus). Si no llega, se deduce de los datos (null = cargando). */
export type MedalsStatus = 'loading' | 'error' | 'ready';

export type MedalsSummary = {
  totalUnlocked: number;
  totalAchievements: number;
  recent: { id: string; icon: string; name: string }[];
};

export type MedalsView =
  | { kind: 'loading' }
  | { kind: 'error' }
  /** Sin ninguna medalla desbloqueada (N = 0). */
  | { kind: 'empty'; total: number }
  /** Hay medallas pero la última no se puede identificar (ninguna trae fecha de desbloqueo): ícono genérico y sin nombre. */
  | { kind: 'unidentified'; unlocked: number; total: number }
  | { kind: 'medals'; unlocked: number; total: number; last: { id: string; icon: string; name: string } };

/**
 * Cargando = esqueleto (NUNCA "Desbloquea tu primera" mientras llegan los datos); error = guion; N = 0 = vacío; con medallas = el diseño completo.
 * El estado explícito manda sobre los datos.
 */
export function medalsView(summary: MedalsSummary, status: MedalsStatus = 'ready'): MedalsView {
  if (status === 'loading') return { kind: 'loading' };
  if (status === 'error') return { kind: 'error' };
  const unlocked = Math.max(0, Math.floor(summary.totalUnlocked));
  const total = Math.max(0, Math.floor(summary.totalAchievements));
  if (unlocked === 0) return { kind: 'empty', total };
  const last = summary.recent[0];
  if (!last) return { kind: 'unidentified', unlocked, total };
  return { kind: 'medals', unlocked, total, last };
}

/** Estado de la consulta: el que entrega home.tsx (streakStatus) o, si no llega, deducido de los datos de la racha (null = cargando). */
export function medalsStatusOf(streakStatus: MedalsStatus | undefined, statsAreNull: boolean): MedalsStatus {
  return streakStatus ?? (statsAreNull ? 'loading' : 'ready');
}

export const MEDALS_TITLE = 'Medallas';
export const FIRST_MEDAL_HINT = 'Desbloquea tu primera';
export const NO_DATA = '—';

/** Contadores "N de M": hasta 3 caracteres numéricos en total el tamaño completo; más largos bajan por tramos (sin adjustsFontSizeToFit). */
export function counterSizes(unlocked: number, total: number): { number: number; of: number } {
  const digits = String(unlocked).length + String(total).length;
  if (digits <= 3) return { number: 36, of: 20 };
  if (digits <= 5) return { number: 32, of: 18 };
  return { number: 28, of: 16 };
}

/** Fracción llena de la barra: N / M con tope 100 %; 0 si no hay medallas o no hay total. */
export function barFraction(unlocked: number, total: number): number {
  if (unlocked <= 0 || total <= 0) return 0;
  return Math.min(1, unlocked / total);
}

/** Ancho mínimo visual del relleno (dp) cuando N > 0 (proporcional al grosor de la barra, 7 dp): con N/M muy pequeño el relleno nunca desaparece. Con N = 0 no hay relleno. */
export const MIN_FILL_PX = 6;

/** Ícono genérico de la medalla cuando no hay una última identificable o no hay medallas (el mismo glifo "award" que usa hoy la tarjeta). */
export const GENERIC_ICON = 'award';

/** Frase completa de la tarjeta para lectores de pantalla (la tarjeta es UN botón que abre Medallas). El texto "Último logro" ya no se ve en la tarjeta, pero la frase lo conserva. */
export function medalsA11yLabel(view: MedalsView): string {
  switch (view.kind) {
    case 'loading':
      return 'Medallas: cargando. Ver medallas';
    case 'error':
      return 'Medallas: sin datos. Ver medallas';
    case 'empty':
      return `Medallas: 0 de ${view.total} desbloqueadas. Desbloquea tu primera. Ver medallas`;
    case 'unidentified':
      return `Medallas: ${view.unlocked} de ${view.total} desbloqueadas. Ver medallas`;
    default:
      return `Medallas: ${view.unlocked} de ${view.total} desbloqueadas. Último logro: ${view.last.name}. Ver medallas`;
  }
}

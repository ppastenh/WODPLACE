import { todayInChile } from '../../lib/dateUtils';

/**
 * Lógica PURA de la tarjeta del WOD de Inicio (decisión (ab) de DECISIONES-DISENO.md). Sin React Native: la dibuja WodCard.tsx. No decide nada nuevo: qué WOD hay hoy lo decide el servidor (GET /wod/today) y
 * home.tsx; aquí solo se da forma a lo que llega. NO inventa datos: nombre, modalidad, tope de tiempo y texto son los del WOD.
 */

/** Estado de la consulta del WOD (lo entrega home.tsx a partir de React Query). Si HomeView no lo recibe, se asume 'ready' (como hasta ahora: sin WOD = no se dibuja nada). */
export type WodStatus = 'loading' | 'error' | 'ready';

/** Igual que prStatusFrom: con datos = lista (aunque un refresco falle; {wod: null} también es "lista"), sin datos y con error = error, sin datos ni error = cargando. */
export function wodStatusFrom(query: { data: unknown; isError: boolean }): WodStatus {
  if (query.data) return 'ready';
  return query.isError ? 'error' : 'loading';
}

/**
 * Ids de los WOD del catálogo (los "héroes"/benchmark). Es la MISMA lista que HERO_WODS de api-server (src/lib/achievements/catalog.ts) y que la siembra de supabase/migrations/20260930090000_wod_of_the_day.sql (comprobado a mano el 2026-11-22: los mismos 19 ids); una prueba exige que coincida con la del servidor. El tipo de tarjeta se decide por el id de la entrada del catálogo (wod_of_day.wod_id → wods.id, que GET /wod/today entrega como wodId), NUNCA por el nombre: un WOD que el coach escribe
 * a mano lleva un id "custom-…" y es estándar aunque se llame "Fran".
 */
export const CATALOG_WOD_IDS: readonly string[] = [
  'fran',
  'grace',
  'helen',
  'isabel',
  'diane',
  'annie',
  'nancy',
  'karen',
  'fight-gone-bad',
  'murph',
  'chad',
  'dt',
  'cindy',
  'angie',
  'barbara',
  'chelsea',
  'elizabeth',
  'linda',
  'kalsu',
];
export const isCatalogWodId = (wodId: string): boolean => CATALOG_WOD_IDS.includes(wodId);

export type WodVariant = 'estandar' | 'especial';

/** Lo que usa la tarjeta de un TodayWod (los mismos campos que entrega la API). */
export type WodInput = {
  wodId: string;
  name: string;
  format: string;
  timeCapMinutes: number | null;
  description: string | null;
  sessionDate: string;
  myResult?: unknown;
};

export type WodView =
  | { kind: 'hidden' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | {
      kind: 'wod';
      variant: WodVariant;
      name: string;
      formatLabel: string | null;
      timeCapLabel: string | null;
      summary: string | null;
      registered: boolean;
      /** "SOLO HOY": solo la variante especial, y solo si sessionDate es hoy en hora de Chile. */
      soloHoy: boolean;
      a11yLabel: string;
    };

/** Modalidad real (campo format del WOD). Un valor desconocido no se inventa: sin etiqueta. */
export function formatLabelOf(format: string): string | null {
  if (format === 'for_time') return 'For Time';
  if (format === 'amrap') return 'AMRAP';
  if (format === 'max_reps') return 'Max Reps';
  return null;
}

/** Tope de tiempo real (timeCapMinutes), si existe. */
export function timeCapLabelOf(minutes: number | null | undefined): string | null {
  return minutes != null && minutes > 0 ? `Tope ${minutes} min` : null;
}

/** El texto del coach tal como lo escribió (solo se recortan los espacios de los bordes); null si no hay (sin descripción no queda hueco). */
export function wodSummaryOf(description: string | null | undefined): string | null {
  const t = (description ?? '').trim();
  return t.length > 0 ? t : null;
}

/**
 * Tamaño del nombre (Anton) por tramos según el largo, SIN adjustsFontSizeToFit y sin "…": si aun así no cabe en una línea pasa a las que necesite. La variante especial es más grande que la estándar.
 */
export function wodNameFontSize(name: string, variant: WodVariant): number {
  const len = name.trim().length;
  const tiers = variant === 'especial' ? [34, 30, 26, 22, 18] : [26, 23, 20, 18, 16];
  if (len <= 8) return tiers[0]!;
  if (len <= 12) return tiers[1]!;
  if (len <= 16) return tiers[2]!;
  if (len <= 22) return tiers[3]!;
  return tiers[4]!;
}

export const WOD_A11Y_HINT = 'Abre el WOD';

/** Clave "aaaa-mm-dd" de hoy en hora de Chile (la misma que usa el servidor para decidir qué WOD es el de hoy). */
export function todayKeyInChile(): string {
  const t = todayInChile();
  return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
}

/** Frase para el lector de pantalla: "WOD especial: Fran, For Time. 21-15-9… Ver detalle" / "WOD del día: …" (con ", registrado" si ya hay resultado). */
export function wodA11yLabelOf(v: { variant: WodVariant; name: string; formatLabel: string | null; timeCapLabel: string | null; summary: string | null; registered: boolean }): string {
  const head = [v.name, v.formatLabel, v.timeCapLabel, v.registered ? 'registrado' : null].filter(Boolean).join(', ');
  const prefix = v.variant === 'especial' ? 'WOD especial' : 'WOD del día';
  return `${prefix}: ${head}.${v.summary ? ` ${v.summary}.` : ''} Ver detalle`;
}

/**
 * Cargando = esqueleto (nunca "sin WOD" mientras carga); error = marco con un guion; listo sin WOD = nada (como hoy); listo con WOD = la tarjeta (especial si su wodId es del catálogo, estándar si no).
 * El estado explícito manda sobre los datos.
 */
export function wodCardView(wod: WodInput | null, status: WodStatus, todayKey: string): WodView {
  if (status === 'loading') return { kind: 'loading' };
  if (status === 'error') return { kind: 'error' };
  if (!wod) return { kind: 'hidden' };
  const variant: WodVariant = isCatalogWodId(wod.wodId) ? 'especial' : 'estandar';
  const base = {
    variant,
    name: wod.name,
    formatLabel: formatLabelOf(wod.format),
    timeCapLabel: timeCapLabelOf(wod.timeCapMinutes),
    summary: wodSummaryOf(wod.description),
    registered: !!wod.myResult,
  };
  return { kind: 'wod', ...base, soloHoy: variant === 'especial' && wod.sessionDate === todayKey, a11yLabel: wodA11yLabelOf(base) };
}

// ── Bloques por ejercicio: PREPARADOS, SIN USAR ────────────────────────────────────────────────────────────────
// Hoy los ejercicios NO vienen separados (el coach escribe un solo texto libre), así que la tarjeta no los usa. Esto deja listo cómo se partiría una lista cuando existan los datos separados
// (WodExerciseBlocks.tsx): los primeros que quepan y un "+N" discreto con el resto. Una prueba confirma que ni la tarjeta ni Inicio lo usan.
export function blocksVisible<T>(items: readonly T[], max: number): { shown: T[]; more: number } {
  const shown = items.slice(0, Math.max(0, max));
  return { shown, more: items.length - shown.length };
}

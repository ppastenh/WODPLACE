/**
 * Lógica PURA de la tarjeta "PR destacado" de Inicio (decisión (x) de DECISIONES-DISENO.md). Sin React: la dibuja PrHighlightCard.tsx.
 * No decide nada nuevo: la rotación diaria entre las marcas la sigue haciendo app/home.tsx (rotatingFeaturedPr); aquí solo se da forma a lo que llega.
 */

/** Estado de la consulta de las marcas. Si HomeView no lo recibe, se asume 'ready' (como hasta ahora: null = sin marcas). */
export type PrStatus = 'loading' | 'ready';

export type PrView = { kind: 'loading' } | { kind: 'empty' } | { kind: 'pr'; name: string; weightKg: number };

/** Cargando = esqueleto (nunca "Aún no hay PRs" mientras llegan las marcas); sin marca = vacío; con marca = nombre y valor. */
export function prView(pr: { liftName: string; weightKg: number } | null, status: PrStatus = 'ready'): PrView {
  if (status === 'loading') return { kind: 'loading' };
  if (!pr) return { kind: 'empty' };
  return { kind: 'pr', name: pr.liftName, weightKg: pr.weightKg };
}

/** Valor tal como lo muestra Inicio hoy: el número que entrega la app, sin convertir, más " kg" (Inicio no tiene función de formato propia). */
export function prValueText(weightKg: number): string {
  return `${weightKg} kg`;
}

/** Etiqueta accesible de la tarjeta: es la de siempre ("Ver progreso y PRs"); la tarjeta entera es UN botón que abre RM. */
export const PR_A11Y_LABEL = 'Ver progreso y PRs';

export const PR_LABEL = 'PR destacado';
export const PR_EMPTY_TITLE = 'Aún no hay PRs';
export const PR_EMPTY_HINT = 'Registra tu primera marca';

/**
 * Tamaño del nombre del movimiento (Anton) por tramos según el largo, SIN adjustsFontSizeToFit: hasta 10 letras 26 sp, de 11 a 14 22 sp,
 * de 15 a 20 19 sp, más largo 17 sp (y si aun así no cabe en una línea pasa a dos, sin "…" ni cortes).
 */
export function prNameFontSize(name: string): number {
  const len = name.trim().length;
  if (len <= 10) return 26;
  if (len <= 14) return 22;
  if (len <= 20) return 19;
  return 17;
}

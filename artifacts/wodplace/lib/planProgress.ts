/**
 * Qué muestra la tarjeta "Clases del plan" de Inicio (lógica pura, sin React Native: se prueba en el computador con
 * `pnpm --filter @workspace/scripts test:home-logic`). Una sola tarjeta, sin rotación:
 *
 *  - NÚMERO PRINCIPAL = clases REALIZADAS en el período (reservas confirmadas cuya hora de término ya pasó, en hora de
 *    Chile; lo calcula el servidor, ver api-server/src/lib/planPeriodStats.ts). El período es next_payment_at menos
 *    duration_days.
 *  - LÍNEA CHICA = "1 reservada" / "N reservadas" cuando hay clases próximas dentro del período; sin línea si no hay.
 *  - Plan por cantidad de clases ........ 'classes'   -> "N / M" con la barra llena según las realizadas, y la
 *                                                         leyenda "realizadas este período"
 *  - Plan ilimitado ..................... 'unlimited' -> solo el número, la leyenda "clases realizadas este mes" (o
 *                                                         "este período" si el plan no dura un mes) y el chip
 *                                                         "Plan ilimitado"; sin barra ni total
 *  - Sin plan activo .................... 'none'      -> "—" y "Sin plan activo"
 *  - Plan activo pero aún sin datos ..... 'loading'   -> "—" (nunca "Sin plan activo" por error)
 *
 * El aviso "Te quedan N clases este período" NO usa esta lógica: sigue contando realizadas MÁS reservadas (una reserva
 * ya gasta cupo), eso lo calcula el servidor (classesRemaining).
 */

export type PlanProgressInput = {
  hasActivePlan: boolean;
  /** true mientras se pide GET /box-memberships/my-plans. */
  planLoading: boolean;
  plan: {
    /** null = plan ilimitado. */
    classesPerPeriod: number | null;
    /** null hasta que un pago o la asignación del plan fije la fecha del próximo pago. */
    classesCompletedInPeriod: number | null;
    classesReservedInPeriod: number | null;
    durationDays: number;
  } | null;
};

export type PlanProgressView =
  | { kind: 'none' }
  | { kind: 'loading' }
  | { kind: 'unlimited'; completed: number | null; reservedLine: string | null; legend: string; chip: string }
  | {
      kind: 'classes';
      completed: number | null;
      total: number;
      /** Realizadas / total, entre 0 y 1 (la barra nunca pasa de llena). */
      ratio: number;
      reservedLine: string | null;
      legend: string;
    };

export const UNLIMITED_CHIP = 'Plan ilimitado';
export const LEGEND_CLASSES = 'realizadas este período';

/** "1 reservada" / "N reservadas"; null (sin línea) si no hay clases próximas dentro del período. */
export function reservedLine(reserved: number | null | undefined): string | null {
  if (!reserved || reserved <= 0) return null;
  return reserved === 1 ? '1 reservada' : `${reserved} reservadas`;
}

/** Un plan "de un mes" dura entre 28 y 31 días; cualquier otra duración dice "este período". */
export function unlimitedLegend(durationDays: number): string {
  return durationDays >= 28 && durationDays <= 31 ? 'clases realizadas este mes' : 'clases realizadas este período';
}

export function planProgressView(input: PlanProgressInput): PlanProgressView {
  if (!input.hasActivePlan) return { kind: 'none' };
  const plan = input.plan;
  if (!plan) return input.planLoading ? { kind: 'loading' } : { kind: 'none' };
  const completed = plan.classesCompletedInPeriod;
  const line = reservedLine(plan.classesReservedInPeriod);
  if (plan.classesPerPeriod == null) {
    return { kind: 'unlimited', completed, reservedLine: line, legend: unlimitedLegend(plan.durationDays), chip: UNLIMITED_CHIP };
  }
  const total = plan.classesPerPeriod;
  const ratio = completed != null && total > 0 ? Math.min(completed / total, 1) : 0;
  return { kind: 'classes', completed, total, ratio, reservedLine: line, legend: LEGEND_CLASSES };
}

/**
 * Piezas de la tarjeta ancha "Progreso mensual" a partir de la vista del plan (lo único que decide qué se dibuja):
 *  - value / totalSuffix ... número grande y, solo en plan por cantidad, " / M clases"
 *  - showBar ............... barra solo en plan por cantidad
 *  - topRightReserved ...... "N reservada(s)" arriba a la derecha (plan por cantidad); null si no hay próximas
 *  - chip + chipReserved ... plan ilimitado: chip arriba a la derecha y, debajo, "N reservada(s)" si hay
 */
export type MonthlyCardParts = {
  value: string;
  totalSuffix: string | null;
  showBar: boolean;
  ratio: number;
  legend: string;
  topRightReserved: string | null;
  chip: string | null;
  chipReserved: string | null;
};

export function monthlyCardParts(view: PlanProgressView): MonthlyCardParts | null {
  if (view.kind === 'classes') {
    return {
      value: String(view.completed ?? '—'),
      totalSuffix: ` / ${view.total} clases`,
      showBar: true,
      ratio: view.ratio,
      legend: view.legend,
      topRightReserved: view.reservedLine,
      chip: null,
      chipReserved: null,
    };
  }
  if (view.kind === 'unlimited') {
    return {
      value: String(view.completed ?? '—'),
      totalSuffix: null,
      showBar: false,
      ratio: 0,
      legend: view.legend,
      topRightReserved: null,
      chip: view.chip,
      chipReserved: view.reservedLine,
    };
  }
  return null;
}

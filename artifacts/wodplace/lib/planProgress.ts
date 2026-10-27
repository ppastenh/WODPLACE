/**
 * Qué muestra el mosaico "Clases del plan" de Inicio (lógica pura, sin React Native: se prueba en el computador
 * con `pnpm --filter @workspace/scripts test:home-logic`).
 *
 *  - Sin plan activo ................................ 'none'      -> "—" / "Sin plan activo"
 *  - Plan activo SIN clases por período (ilimitado) .. 'unlimited' -> "Plan ilimitado" (sin barra)
 *  - Plan activo con clases por período .............. 'classes'   -> "N / M" con la barra de siempre
 *  - Plan activo pero todavía no llegan sus datos .... 'loading'   -> "—" (nunca "Sin plan activo" por error)
 *
 * Antes, un plan ilimitado caía en "Sin plan activo" (engañoso) porque el mosaico solo sabía mostrar el caso
 * "con clases por período".
 */

export type PlanProgressInput = {
  hasActivePlan: boolean;
  /** true mientras se pide GET /box-memberships/my-plans. */
  planLoading: boolean;
  plan: { classesPerPeriod: number | null; classesUsedInPeriod: number | null } | null;
};

export type PlanProgressView =
  | { kind: 'none' }
  | { kind: 'loading' }
  | { kind: 'unlimited' }
  /** `used` es null si el período todavía no tiene fecha de inicio (aún no se registra un pago). */
  | { kind: 'classes'; used: number | null; total: number; ratio: number };

export function planProgressView(input: PlanProgressInput): PlanProgressView {
  if (!input.hasActivePlan) return { kind: 'none' };
  const plan = input.plan;
  if (!plan) return input.planLoading ? { kind: 'loading' } : { kind: 'none' };
  if (plan.classesPerPeriod == null) return { kind: 'unlimited' };
  const total = plan.classesPerPeriod;
  const used = plan.classesUsedInPeriod;
  const ratio = used != null && total > 0 ? Math.min(used / total, 1) : 0;
  return { kind: 'classes', used, total, ratio };
}

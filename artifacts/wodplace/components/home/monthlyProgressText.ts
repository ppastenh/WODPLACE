/**
 * Frase completa para lectores de pantalla de la tarjeta "Progreso mensual" (lógica pura, sin React Native: se prueba con test:home-logic).
 * Solo arma texto a partir de lo que ya entrega planProgressView / monthlyCardParts; no calcula nada nuevo ni inventa datos.
 *
 *  - Por cantidad: "Progreso mensual: 4 de 12 clases realizadas, 1 reservada"
 *  - Ilimitado:    "Plan ilimitado: 4 clases realizadas este mes, 1 reservada"
 *  - Sin dato todavía (completed null): se dice que aún no hay dato; nunca un número inventado.
 */
import type { PlanProgressView } from '../../lib/planProgress';

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function monthlyProgressA11yLabel(view: PlanProgressView): string | null {
  if (view.kind === 'classes') {
    const reserved = view.reservedLine ? `, ${view.reservedLine}` : '';
    if (view.completed == null) return `Progreso mensual: aún sin dato de clases realizadas, de ${view.total} ${plural(view.total, 'clase', 'clases')}${reserved}`;
    return `Progreso mensual: ${view.completed} de ${view.total} ${plural(view.total, 'clase', 'clases')} ${plural(view.total, 'realizada', 'realizadas')}${reserved}`;
  }
  if (view.kind === 'unlimited') {
    const reserved = view.reservedLine ? `, ${view.reservedLine}` : '';
    if (view.completed == null) return `Plan ilimitado: aún sin dato de clases realizadas${reserved}`;
    // La leyenda viene como "clases realizadas este mes" / "este período": en singular, "clase realizada ...".
    const legend = view.completed === 1 ? view.legend.replace('clases realizadas', 'clase realizada') : view.legend;
    return `Plan ilimitado: ${view.completed} ${legend}${reserved}`;
  }
  return null;
}

/** Valor de la barra para lectores de pantalla: min 0, max = total, now = realizadas (nunca más que el total). */
export function monthlyProgressBarValue(view: PlanProgressView): { min: number; max: number; now: number } | null {
  if (view.kind !== 'classes') return null;
  return { min: 0, max: view.total, now: Math.min(view.completed ?? 0, view.total) };
}

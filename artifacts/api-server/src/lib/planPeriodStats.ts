import { isSessionEndedInChile } from "./dateUtils";

/**
 * Estadísticas del período del plan de una alumna (tarjeta "Clases del plan" de Inicio y aviso "Te quedan N clases").
 * Lógica pura (sin base de datos): la ruta GET /box-memberships/my-plans le pasa las reservas y esto las cuenta; se
 * prueba en el computador con `pnpm --filter @workspace/scripts test:home-logic`.
 *
 * Período = [next_payment_at - duration_days, next_payment_at): incluye el primer día y NO incluye el día del próximo
 * pago.
 *  - REALIZADAS: reservas confirmadas ("inscrito") del período cuya hora de TÉRMINO ya pasó, en hora de Chile.
 *    Una clase que termina justo ahora (término == hora actual) ya cuenta como realizada.
 *  - RESERVADAS: reservas confirmadas del período que todavía no terminaron (próximas o en curso).
 *  - Una reserva en lista de espera o cancelada no cuenta como ninguna de las dos.
 *  - El cupo gastado del plan (classesUsedInPeriod) = realizadas + reservadas: una reserva ya gasta cupo.
 */

export type PeriodBooking = {
  /** Estado de la reserva en class_bookings: solo "inscrito" cuenta. */
  status: string;
  /** YYYY-MM-DD (fecha de la clase en Chile). */
  sessionDate: string;
  /** HH:MM o HH:MM:SS. */
  startTime: string;
  durationMinutes: number;
};

export type PeriodWindow = { start: string; endExclusive: string };

const DAY_MS = 86_400_000;

function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Ventana del período con aritmética de fechas en UTC puro (sin depender de la zona horaria del servidor). */
export function periodWindow(nextPaymentAt: string, durationDays: number): PeriodWindow {
  return { start: addDaysToDateKey(nextPaymentAt, -durationDays), endExclusive: nextPaymentAt };
}

export function summarizePeriodClasses(
  bookings: PeriodBooking[],
  window: PeriodWindow,
  now: Date = new Date(),
): { completed: number; reserved: number } {
  let completed = 0;
  let reserved = 0;
  for (const b of bookings) {
    if (b.status !== "inscrito") continue;
    if (b.sessionDate < window.start || b.sessionDate >= window.endExclusive) continue;
    const [h, m] = b.startTime.split(":").map(Number);
    const endMinutes = (h ?? 0) * 60 + (m ?? 0) + (b.durationMinutes || 0);
    if (isSessionEndedInChile(b.sessionDate, endMinutes, now)) completed += 1;
    else reserved += 1;
  }
  return { completed, reserved };
}

/** Clases que le quedan en un plan por cantidad: una reserva gasta cupo igual que una realizada. */
export function classesRemainingInPeriod(classesPerPeriod: number, completed: number, reserved: number): number {
  return Math.max(0, classesPerPeriod - (completed + reserved));
}

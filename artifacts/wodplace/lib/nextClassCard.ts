/**
 * Lógica pura de la tarjeta de próxima clase de Inicio (sin React Native: se prueba en el computador con
 * `pnpm --filter @workspace/scripts test:home-logic`).
 *
 * Tres estados, y el estado se decide SOLO cuando termina de cargar:
 *  - 'loading': todavía no llegaron las clases -> esqueleto (nunca la invitación a reservar, que sería mentira
 *    si la alumna ya tiene una reserva que aún no cargó);
 *  - 'booked': tiene una clase reservada próxima -> "Tu próxima clase" con los datos de la clase;
 *  - 'invite': no tiene reserva (haya clases sugeridas, no haya clases, o haya fallado la carga) -> solo la
 *    invitación "Reserva tu próxima clase" que lleva al Calendario.
 */

/** Lo que BookingContext pone cuando la clase no tiene coach; Inicio lo trata como "sin coach". */
export const NO_COACH_LABEL = 'Sin coach asignado';

export type NextClassCardState = 'loading' | 'booked' | 'invite';

export function nextClassCardState(input: { isLoading: boolean; hasUpcomingBooking: boolean }): NextClassCardState {
  if (input.isLoading) return 'loading';
  return input.hasUpcomingBooking ? 'booked' : 'invite';
}

/**
 * Etiqueta de accesibilidad de la tarjeta "Tu próxima clase" con reserva: la tarjeta entera es el único botón (los íconos y las capas
 * decorativas se ocultan a los lectores de pantalla) y se anuncia con la clase, la fecha y la hora, y a dónde lleva.
 */
export function nextClassA11yLabel(className: string, when: string): string {
  return `Tu próxima clase: ${className.trim()}, ${when.trim()}. Ir al Calendario`;
}

/**
 * Línea del coach: "Coach {nombre}" con la palabra una sola vez, o `null` (la línea se oculta) si la clase no
 * tiene coach asignado. Si el nombre ya empieza con "Coach" no se repite el prefijo.
 */
export function coachLine(coach: string | null | undefined): string | null {
  const name = (coach ?? '').trim();
  if (!name || name === NO_COACH_LABEL) return null;
  if (/^coach\b/i.test(name)) return name;
  return `Coach ${name}`;
}

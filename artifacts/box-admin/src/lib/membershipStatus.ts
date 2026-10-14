/**
 * S3.A de la auditoría de seguridad (2026-10-14): para un coach, el plan y
 * la fecha exacta de próximo pago se reemplazan por este estado simple —
 * sin montos, sin nombre de plan, sin fecha. "Hoy" siempre en hora de
 * Chile (regla del proyecto), nunca con los métodos locales de `Date`.
 */
export function todayInChileKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

export type MembershipStatusLabel = 'Vigente' | 'Vencida';

/** `null` cuando no hay fecha de próximo pago que comparar (sin plan
 *  asignado) — el llamador decide qué mostrar en ese caso (nada, o "Sin
 *  plan"), esto nunca adivina. */
export function membershipStatusLabel(nextPaymentAt: string | null | undefined): MembershipStatusLabel | null {
  if (!nextPaymentAt) return null;
  // nextPaymentAt llega como fecha (YYYY-MM-DD) o timestamp — se compara
  // solo la parte de fecha, en hora de Chile, igual que el resto del
  // proyecto compara "hoy".
  const datePart = nextPaymentAt.slice(0, 10);
  return datePart >= todayInChileKey() ? 'Vigente' : 'Vencida';
}

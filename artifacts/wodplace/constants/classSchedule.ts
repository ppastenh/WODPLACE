/**
 * Deterministic hash used for small "pick a stable value from an id" needs
 * elsewhere in the app (e.g. home.tsx's quote-of-the-day index,
 * community.tsx). The fixed weekly class template + fake-attendee
 * generation that used to live here was removed once Agendar switched to
 * real per-box class_sessions/class_bookings (see context/BookingContext.tsx).
 */
export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

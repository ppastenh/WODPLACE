/**
 * WODPLACE is a single-country (Chile) app — "today" for date-keyed features
 * (WOD del día, achievement streaks) must mean the athlete/box's calendar
 * day, not the server's. `Date#toISOString()` is always UTC regardless of
 * the server's own local timezone, so using it to compute "today" silently
 * breaks for ~3-4 hours a day (whenever Chile's local date and UTC's date
 * disagree, e.g. Chile 21:00 is already UTC's next day) — confirmed bug: a
 * WOD published from box-admin (browser, Chile local time) at that hour got
 * session_date = today-in-Chile, but this server-side "today" resolved to
 * tomorrow, so it never matched.
 *
 * Hardcoded to America/Santiago rather than trusting the server process's
 * own resolved timezone (which happens to already be Santiago in this
 * environment, but that's incidental, not guaranteed if ever deployed
 * elsewhere) — explicit beats implicit for something this easy to silently
 * break again.
 */
export function todayDateKey(timeZone = "America/Santiago"): string {
  // en-CA formats as YYYY-MM-DD — the one locale that happens to match the
  // ISO date-key format this app uses everywhere else.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/** "Ahora" como fecha + minuto-del-día en hora de Chile -- mismo patrón que
 *  todayDateKey(), extendido con la hora para poder comparar contra el fin
 *  de una clase (ver isSessionEndedInChile) sin construir nunca un `Date`
 *  con esos números (eso se interpretaría en la hora del servidor, no la
 *  de Chile -- mismo riesgo que todayDateKey ya documenta arriba). Mismo
 *  helper duplicado en wodplace/lib/dateUtils.ts y box-admin/src/lib/time.ts
 *  (cliente) -- no hay un paquete compartido entre los tres hoy. */
export function nowInChileParts(reference: Date = new Date(), timeZone = "America/Santiago"): { dateKey: string; minutesOfDay: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(reference);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return { dateKey: `${map.year}-${map.month}-${map.day}`, minutesOfDay: Number(map.hour) * 60 + Number(map.minute) };
}

/** Si una clase (fecha + minuto de fin) ya terminó, comparado contra
 *  "ahora" en hora de Chile. */
export function isSessionEndedInChile(sessionDateKey: string, endMinutes: number, reference: Date = new Date()): boolean {
  const chileNow = nowInChileParts(reference);
  if (sessionDateKey !== chileNow.dateKey) return sessionDateKey < chileNow.dateKey;
  return endMinutes <= chileNow.minutesOfDay;
}

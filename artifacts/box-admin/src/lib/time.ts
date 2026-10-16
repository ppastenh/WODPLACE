/** "Ahora" como fecha + minuto-del-día en hora de Chile (America/Santiago),
 *  independiente de la zona del navegador -- mismo patrón que
 *  wodplace/lib/dateUtils.ts: comparar dos tuplas (dateKey, minutos) es
 *  exacto, nunca hace falta un objeto Date para esto. */
function nowInChileParts(reference: Date = new Date()): { dateKey: string; minutesOfDay: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
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

/** Clase ya terminada (hora de fin, hora de Chile) -- solo para la
 *  etiqueta "Terminada"; el panel nunca bloquea abrir una clase pasada
 *  (el staff necesita poder marcar asistencia ahí). */
export function isClassEnded(dateKey: string, startTime: string, durationMinutes: number, reference: Date = new Date()): boolean {
  const [h, m] = startTime.split(":").map(Number);
  const endMinutes = (h ?? 0) * 60 + (m ?? 0) + (durationMinutes || 0);
  const chileNow = nowInChileParts(reference);
  if (dateKey !== chileNow.dateKey) return dateKey < chileNow.dateKey;
  return endMinutes <= chileNow.minutesOfDay;
}

/** "En curso" ahora mismo (entre inicio y fin), en hora de Chile -- mismo
 *  reemplazo que isClassEnded para el dashboard, que antes construía un
 *  `new Date(...)` sin zona (se interpreta en la hora del NAVEGADOR del
 *  administrador, no necesariamente la de Chile). */
export function isClassLive(dateKey: string, startTime: string, durationMinutes: number, reference: Date = new Date()): boolean {
  const [h, m] = startTime.split(":").map(Number);
  const startMinutes = (h ?? 0) * 60 + (m ?? 0);
  const endMinutes = startMinutes + (durationMinutes || 0);
  const chileNow = nowInChileParts(reference);
  if (dateKey !== chileNow.dateKey) return false;
  return chileNow.minutesOfDay >= startMinutes && chileNow.minutesOfDay < endMinutes;
}

/** "HH:MM" o "HH:MM:SS" -> "HH:MM", sin segundos. AM/PM llega en un
 *  commit aparte (ver ESTADO.md). */
export function formatTimeLabel(time: string | null | undefined): string {
  if (!time) return "—";
  const [hStr, mStr] = time.split(":");
  return `${String(hStr ?? "0").padStart(2, "0")}:${String(mStr ?? "0").padStart(2, "0")}`;
}

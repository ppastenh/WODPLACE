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

/** Formatter ÚNICO de hora para las pantallas de clases del panel (listas,
 *  vista rápida, detalle, ficha del miembro) -- cambiar aquí cambia todas
 *  a la vez. `time` es el "start_time" de la base ("HH:MM" o "HH:MM:SS"),
 *  pura aritmética de dígitos, nunca pasa por un objeto Date -- no hay
 *  ninguna zona horaria del dispositivo que corregir acá, la hora de
 *  clase que guarda el box ya es la hora de Chile. 00:00 es 12:00 AM y
 *  12:00 es 12:00 PM.
 */
export function formatTimeLabel(time: string | null | undefined): string {
  if (!time) return "—";
  const [hStr, mStr] = time.split(":");
  const h24 = Number(hStr ?? 0);
  const m = Number(mStr ?? 0);
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

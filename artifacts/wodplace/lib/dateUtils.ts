/** Indexed by `Date.getDay()` (0 = Sunday) — for looking up a specific
 *  date's label, not for rendering a week's header row in order. */
export const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
/** Monday-first, for the week/month grid header row (weeks start on
 *  Monday — see startOfWeek). */
export const WEEK_HEADER_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(date: Date, amount: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function addMonths(date: Date, amount: number): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + amount);
  return d;
}

export function isBeforeDay(date: Date, reference: Date): boolean {
  return startOfDay(date).getTime() < startOfDay(reference).getTime();
}

export function isAfterDay(date: Date, reference: Date): boolean {
  return startOfDay(date).getTime() > startOfDay(reference).getTime();
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  // getDay() is 0=Sunday..6=Saturday; weeks start Monday, so Sunday (0)
  // needs to roll back 6 days instead of 0.
  const diff = day === 0 ? 6 : day - 1;
  return addDays(d, -diff);
}

/** Returns a 6-row x 7-col grid of dates covering the full month view. */
export function getMonthMatrix(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = startOfWeek(firstOfMonth);
  const weeks: Date[][] = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatDayLabel(date: Date, now: Date): string {
  if (isSameDay(date, now)) return 'Hoy';
  if (isSameDay(date, addDays(now, 1))) return 'Mañana';
  return `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
}

export function formatWeekdayLong(date: Date): string {
  const names = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ];
  return names[date.getDay()] ?? '';
}

/** Formatter ÚNICO de hora de clase para toda la app (Calendario, Inicio,
 *  Perfil -- vía ClassCard/timeRangeLabel y el "Próxima clase" de Home) --
 *  cambiar aquí cambia todas las pantallas a la vez. `totalMinutes` ya es
 *  un número de minutos-del-día de pura aritmética (hora*60+minuto),
 *  nunca pasa por un objeto Date, así que no hay ninguna dependencia de
 *  la zona horaria del dispositivo que corregir acá -- la hora de clase
 *  que guarda el box siempre se trata como hora de Chile, sea cual sea
 *  el reloj del teléfono. 00:00 es 12:00 AM y 12:00 es 12:00 PM.
 */
export function formatHM(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(normalized / 60);
  const m = normalized % 60;
  const period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function parseTimeToMinutes(time: string): number {
  const parts = time.split(':');
  const h = Number(parts[0] ?? '0');
  const m = Number(parts[1] ?? '0');
  return h * 60 + m;
}

export function formatDuration(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }
  return `${minutes} min`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Formats an ISO "yyyy-mm-dd" date string as "14 de marzo de 1998". */
export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const monthName = (MONTH_NAMES[month - 1] ?? '').toLowerCase();
  return `${day} de ${monthName} de ${year}`;
}

/** Computes age in whole years from an ISO "yyyy-mm-dd" birthdate, as of `now`. */
export function getAge(isoBirthdate: string, now: Date = new Date()): number {
  const [year, month, day] = isoBirthdate.split('-').map(Number);
  let age = now.getFullYear() - year;
  const hasHadBirthdayThisYear =
    now.getMonth() + 1 > month ||
    (now.getMonth() + 1 === month && now.getDate() >= day);
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/** "Ahora" como fecha + minuto-del-día en hora de Chile (America/Santiago),
 *  independiente de la zona del dispositivo -- para comparar contra el
 *  horario de una clase (dateKey + minutos-del-día, la misma forma en que
 *  se guarda) sin construir nunca un `Date` con esos números (eso sería
 *  interpretarlos en la hora LOCAL del dispositivo, el mismo bug ya
 *  corregido para el WOD del día y los cumpleaños). Comparar dos tuplas
 *  (dateKey, minutos) es exacto y no necesita resolver el huso horario de
 *  Chile para una duración -- solo orden, nunca una diferencia en ms. */
export function nowInChileParts(reference: Date = new Date()): { dateKey: string; minutesOfDay: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(reference);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    minutesOfDay: Number(map.hour) * 60 + Number(map.minute),
  };
}

/** Si una clase (dateKey + minuto de fin) ya terminó, comparado contra
 *  "ahora" en hora de Chile -- ver nowInChileParts(). */
export function isSessionEndedInChile(
  dateKey: string,
  endMinutes: number,
  reference: Date = new Date(),
): boolean {
  const chileNow = nowInChileParts(reference);
  if (dateKey !== chileNow.dateKey) return dateKey < chileNow.dateKey;
  return endMinutes <= chileNow.minutesOfDay;
}

/** Chile's actual calendar date (America/Santiago), independent of the
 *  device's own timezone/clock setting — same fix as api-server's
 *  todayDateKey() for the same reason (WODPLACE is Chile-only; a device
 *  near Chile's ~21:00-midnight window, or simply set to a different
 *  timezone, must still agree with everyone else on what day "today" is
 *  for the Home birthday card). */
export function todayInChile(): { year: number; month: number; day: number } {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
  })
    .format(new Date())
    .split('-')
    .map(Number);
  return { year, month, day };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Whether `month`/`day` (from an ISO birthdate, year ignored) falls on
 *  `today` — Feb 29 in a non-leap `today.year` is treated as March 1,
 *  matching the same choice made server-side for the upcoming-birthdays
 *  list (see daysUntilNextOccurrence's doc comment in api-server's
 *  routes/boxes.ts) rather than relying on Date's own rollover here,
 *  since this is plain integer comparison, not Date arithmetic. */
export function isBirthdayToday(
  birthMonth: number,
  birthDay: number,
  today: { year: number; month: number; day: number },
): boolean {
  const normalized =
    birthMonth === 2 && birthDay === 29 && !isLeapYear(today.year)
      ? { month: 3, day: 1 }
      : { month: birthMonth, day: birthDay };
  return normalized.month === today.month && normalized.day === today.day;
}

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

/**
 * In-memory only (never persisted) holder for the admin access code once
 * verified via /admin/verify. Cleared on app reload, which is fine since
 * the dashboard is reached via the side drawer + code prompt each time.
 */
let adminCode: string | null = null;

export function setAdminCode(code: string): void {
  adminCode = code;
}

export function getAdminCode(): string | null {
  return adminCode;
}

export function clearAdminCode(): void {
  adminCode = null;
}

/**
 * In-memory only (never persisted) holder for the admin session token once
 * obtained via the PIN flow (/admin/pin/verify | /setup | /session). Cleared
 * on app reload, which is fine: the dashboard is reached from the drawer's
 * "Administrador" item and the PIN prompt each time.
 */
let adminToken: string | null = null;

export function setAdminToken(token: string): void {
  adminToken = token;
}

export function getAdminToken(): string | null {
  return adminToken;
}

export function clearAdminToken(): void {
  adminToken = null;
}

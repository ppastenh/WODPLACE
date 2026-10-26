/**
 * Permiso de entrada al panel de administración (F7-a2, 2026-10-25): vive SOLO en memoria, no es un token, no viaja
 * al servidor y no autoriza nada por sí solo (la sesión, el rol y el box los decide el servidor).
 *
 * Lo concede el candado (admin-login) cuando el PIN, la huella o la creación del PIN salen bien, y lo consume
 * admin-dashboard al abrirse. Es de UN SOLO USO y vence rápido: si alguien llega a /admin-dashboard por un enlace
 * profundo, con el botón "atrás" o desde otra pantalla sin haber pasado por el candado, no hay permiso y se lo
 * manda de vuelta a /admin-login. Mientras el panel está abierto queda "activo"; al salir de la pantalla se libera.
 *
 * Sin dependencias de React Native: se prueba en el computador (scripts/src/test-admin-lock.ts).
 */

/** Vigencia normal: el candado concede el permiso justo antes de navegar al panel. */
export const ENTRY_TTL_MS = 60_000;
/** Vigencia larga: el camino pasa antes por "Datos del Box", donde la persona tarda en llenar el formulario. */
export const ENTRY_TTL_VIA_FORM_MS = 20 * 60_000;

let grantedAt: number | null = null;
let ttlMs = ENTRY_TTL_MS;
let active = false;

export function grantAdminEntry(opts: { ttlMs?: number; now?: number } = {}): void {
  grantedAt = opts.now ?? Date.now();
  ttlMs = opts.ttlMs ?? ENTRY_TTL_MS;
}

/** ¿Hay un permiso vigente? Si lo hay, lo gasta (un solo uso) y deja el panel "activo". */
export function consumeAdminEntry(now: number = Date.now()): boolean {
  const g = grantedAt;
  grantedAt = null; // venza o no, un permiso nunca se usa dos veces
  if (g === null) return false;
  if (now < g || now - g > ttlMs) return false; // reloj atrasado o vencido: no vale
  active = true;
  return true;
}

/** Al salir de la pantalla del panel (o al cerrar sesión): no queda nada. */
export function releaseAdminEntry(): void {
  grantedAt = null;
  active = false;
}

export function isAdminEntryActive(): boolean {
  return active;
}

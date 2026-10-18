import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * S3-B: cuando app_settings.require_aal2_for_super_admin está encendido,
 * las rutas donde SER SUPER ADMIN concede algo (nunca las que ya conceden
 * algo por ser dueño/box_admin/coach) exigen que la sesión del llamador
 * esté en aal2. Hoy el interruptor está apagado -- ninguna de estas
 * funciones cambia nada mientras eso siga así.
 */
const APP_SETTINGS_KEY = "require_aal2_for_super_admin";
const CACHE_TTL_MS = 30_000;

let cached: { value: boolean; at: number } | null = null;

/**
 * Único atajo de prueba que existe en este archivo, y SOLO tiene efecto
 * si NODE_ENV === "test" -- en cualquier otro valor (incluido
 * "production" y cualquier cosa sin definir) esta función siempre
 * devuelve null y el código sigue el camino real de lectura de
 * app_settings. Ver aal2Enforcement.manual-check.cjs para la prueba que
 * demuestra esto último.
 */
function testOverride(): boolean | null {
  if (process.env.NODE_ENV !== "test") return null;
  const raw = process.env.TEST_FORCE_AAL2_ENFORCED;
  if (raw === undefined) return null;
  return raw === "true";
}

async function readFromDb(): Promise<boolean> {
  const result = await db.execute<{ value: string }>(sql`
    select value from app_settings where key = ${APP_SETTINGS_KEY}
  `);
  return result.rows[0]?.value === "true";
}

/** ¿Está encendido el interruptor global? Cacheado ~30s; si la lectura
 *  falla, falla CERRADO (devuelve true) -- pero esto solo hace que las
 *  decisiones de privilegio de super admin exijan aal2 de más, nunca
 *  tira abajo una ruta para quien no es super admin. */
export async function isAal2EnforcementOn(): Promise<boolean> {
  const override = testOverride();
  if (override !== null) return override;

  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value;

  try {
    // Mismo candado que testOverride(): solo tiene efecto si
    // NODE_ENV === "test", para poder probar la rama de "falla cerrado"
    // de abajo sin depender de romper la base de verdad.
    if (process.env.NODE_ENV === "test" && process.env.TEST_FORCE_AAL2_READ_ERROR === "true") {
      throw new Error("Simulación de prueba: lectura de app_settings fallida");
    }
    const value = await readFromDb();
    cached = { value, at: now };
    return value;
  } catch (error) {
    return true;
  }
}

/** True si, dado el estado actual del interruptor, una cuenta cuyo único
 *  camino de autorización es "soy super_admin" puede actuar como tal con
 *  este `aal`. Nunca se usa para el camino de dueño/box_admin/coach. */
export async function isSuperAdminAuthorized(aal: string | null): Promise<boolean> {
  const enforced = await isAal2EnforcementOn();
  return !enforced || aal === "aal2";
}

/** Solo para pruebas: limpia la caché en memoria entre casos. */
export function resetAal2EnforcementCacheForTests(): void {
  cached = null;
}

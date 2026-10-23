import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token de sesión de administrador, emitido por el flujo del PIN y enviado en
 * la cabecera `X-Admin-Session` (NUNCA en `Authorization`: ahí va siempre la
 * sesión verificada de Supabase, que el servidor exige junto al token).
 *
 * Formato v2 (incidente 2026-10-22): `<payload base64url>.<firma>`, con
 * payload JSON `{ v: 2, u: <wodplace_users.id>, b: <box_id | null>, e: <expira ms> }`.
 * `b` ata el token a UN box (null = alcance de plataforma, solo para super
 * admin). Sin estado: la firma es HMAC-SHA256 del payload con ADMIN_ACCESS_CODE.
 *
 * Los tokens del formato anterior (`userId.exp.firma`) no se pueden leer como
 * JSON v2, así que quedan inválidos solos al desplegar; ver ESTADO.md.
 */

const TTL_MS = 30 * 60 * 1000; // 30 minutos

export type AdminTokenClaims = { userId: string; boxId: string | null; exp: number };

function secret(): string {
  const s = process.env.ADMIN_ACCESS_CODE;
  if (!s) {
    throw new Error(
      "ADMIN_ACCESS_CODE is not configured (used as the admin session signing secret)",
    );
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signAdminToken(userId: string, boxId: string | null): string {
  const payload = Buffer.from(
    JSON.stringify({ v: 2, u: userId, b: boxId, e: Date.now() + TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(
  token: string | undefined | null,
): AdminTokenClaims | null {
  if (!token) return null;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);

  const a = Buffer.from(providedSig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const c = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (c?.v !== 2 || typeof c.u !== "string" || !c.u) return null;
    if (c.b !== null && typeof c.b !== "string") return null;
    if (typeof c.e !== "number" || !Number.isFinite(c.e) || Date.now() > c.e) return null;
    return { userId: c.u, boxId: c.b, exp: c.e };
  } catch {
    return null;
  }
}

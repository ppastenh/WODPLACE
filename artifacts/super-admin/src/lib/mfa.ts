import { supabase } from "@/integrations/supabase/client";

export type MfaFactor = {
  id: string;
  friendlyName: string | null;
  status: "verified" | "unverified";
  createdAt: string;
};

export type AssuranceLevel = {
  currentLevel: "aal1" | "aal2" | null;
  nextLevel: "aal1" | "aal2" | null;
};

/** Lee el interruptor global sin tocar app_settings directamente -- esa
 *  tabla no tiene políticas RLS a propósito, esta función de solo lectura
 *  es el único canal permitido para el cliente.
 *
 *  `is_aal2_enforced` es una función nueva (2026-10-18, S3-B) que
 *  `lib/supabase-types` todavía no conoce -- de ahí el `as never` en el
 *  nombre; se puede quitar cuando se regeneren esos tipos. */
export async function isAal2Enforced(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_aal2_enforced" as never);
  if (error) throw error;
  return Boolean(data);
}

export async function getAssuranceLevel(): Promise<AssuranceLevel> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return {
    currentLevel: (data.currentLevel ?? null) as AssuranceLevel["currentLevel"],
    nextLevel: (data.nextLevel ?? null) as AssuranceLevel["nextLevel"],
  };
}

export async function listFactors(): Promise<MfaFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  // IMPORTANTE: `data.totp` de Supabase solo trae factores YA verificados --
  // los sin verificar (de una inscripción interrumpida) solo aparecen en
  // `data.all`. Hay que leer de ahí para poder limpiarlos de verdad.
  return (data.all ?? [])
    .filter((f) => f.factor_type === "totp")
    .map((f) => ({
      id: f.id,
      friendlyName: f.friendly_name ?? null,
      status: f.status,
      createdAt: f.created_at,
    }));
}

/** Factores TOTP sin verificar -- restos de una inscripción interrumpida.
 *  Se desinscriben apenas se detectan, nunca quedan colgando. */
export async function cleanupUnverifiedFactors(): Promise<void> {
  const factors = await listFactors();
  for (const f of factors) {
    if (f.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }
}

/** Inscribe un factor TOTP nuevo. El secreto y el URI otpauth:// viven solo
 *  en memoria, nunca en logs ni en almacenamiento -- el llamador es
 *  responsable de limpiarlos (ver MfaEnrollmentFlow). */
export async function enrollTotpFactor(friendlyName: string) {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });
  if (error) throw error;
  return {
    factorId: data.id,
    secret: data.totp.secret,
    otpauthUri: data.totp.uri,
  };
}

const MAX_ATTEMPTS_BEFORE_COOLDOWN = 5;
const COOLDOWN_MS = 30_000;

/** Lleva la cuenta de códigos incorrectos consecutivos EN MEMORIA (nunca
 *  persistido) para mostrar un mensaje claro antes de que el propio
 *  servidor de Supabase bloquee por exceso de intentos. */
export function createAttemptLimiter() {
  let failures = 0;
  let cooldownUntil = 0;

  return {
    checkCooldown(): string | null {
      const remaining = cooldownUntil - Date.now();
      if (remaining > 0) {
        return `Demasiados intentos. Espera ${Math.ceil(remaining / 1000)} segundos antes de volver a intentar.`;
      }
      return null;
    },
    recordFailure(): string | null {
      failures += 1;
      if (failures >= MAX_ATTEMPTS_BEFORE_COOLDOWN) {
        cooldownUntil = Date.now() + COOLDOWN_MS;
        failures = 0;
        return `Demasiados códigos incorrectos. Espera ${COOLDOWN_MS / 1000} segundos antes de volver a intentar.`;
      }
      return null;
    },
    recordSuccess(): void {
      failures = 0;
      cooldownUntil = 0;
    },
  };
}

export async function verifyFactor(factorId: string, code: string): Promise<void> {
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr) throw challengeErr;
  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyErr) throw verifyErr;
}

export async function unenrollFactor(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

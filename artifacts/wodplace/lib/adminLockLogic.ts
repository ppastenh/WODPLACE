/**
 * Candado LOCAL del panel de administración (F7-a1, 2026-10-25) -- lógica pura.
 *
 * Es un candado de ESTE teléfono: guarda un PIN de 6 dígitos (hash con sal) y un contador de errores, y NO
 * autoriza nada. Quien decide qué puede hacer una cuenta es siempre el servidor (sesión + rol + box).
 * Sirve para el caso del teléfono prestado con la app abierta. Diseño y reglas: PLAN-F2-F7.md, sección
 * "F7-a (versión final)".
 *
 * Esta pieza NO importa nada de React Native ni de Expo: todo lo externo (almacenamiento, reloj, azar, hash y
 * verificación del dispositivo) entra por `LockDeps`. Así se prueba en el computador sin teléfono
 * (`pnpm --filter @workspace/scripts test:admin-lock`). La conexión con SecureStore, expo-crypto y
 * expo-local-authentication va aparte (F7-a2) y no está conectada a ninguna pantalla todavía.
 *
 * Reglas que esta pieza garantiza (cada una tiene su prueba):
 *  - Crear el PIN exige la autenticación del propio dispositivo cuando el teléfono tiene bloqueo de pantalla
 *    (corrección de diseño obligatoria: "Olvidé mi PIN" = cerrar sesión + volver a entrar con Google NO basta).
 *    Sin bloqueo de pantalla se permite y el registro queda marcado como débil.
 *  - Si el estado del teléfono no se puede determinar, se falla hacia lo seguro (no se asume "sin bloqueo").
 *  - Si el registro está dañado o ilegible, NUNCA se ofrece crear uno nuevo encima.
 *  - El intento se suma y se guarda ANTES de comparar el PIN; si no se puede guardar, no se compara.
 *  - Los intentos se atienden de a uno (cola), así dos intentos simultáneos no esquivan el contador.
 *  - La espera es una hora absoluta; se guarda la hora más alta vista y retroceder el reloj no la acorta.
 */

export const PIN_LENGTH = 6;
/** Errores seguidos sin espera; desde el siguiente (el 5.º) empieza la espera. */
export const FREE_ATTEMPTS = 5;
/** Espera tras el 5.º error seguido y cada error posterior (el último escalón es el tope). */
export const WAIT_LADDER_MS = [30_000, 60_000, 300_000, 900_000, 1_800_000] as const;
/** Tiempo en segundo plano tras el cual el panel vuelve a pedir el PIN. */
export const BACKGROUND_RELOCK_MS = 120_000;
export const RECORD_VERSION = 1;
export const DEFAULT_HASH_ITERATIONS = 3000;

export type DeviceSecurity = 'none' | 'secret' | 'biometric';
export type DeviceAuthFailure = 'cancelled' | 'failed' | 'lockout' | 'unavailable';
export type DeviceAuthResult = { ok: true } | { ok: false; reason: DeviceAuthFailure };

export interface LockStore {
  /** `null` = no hay registro. Si falla al leer, debe lanzar (el registro se considera ilegible). */
  read(): Promise<string | null>;
  write(raw: string): Promise<void>;
  remove(): Promise<void>;
}

export interface LockDeps {
  store: LockStore;
  now(): number;
  randomHex(bytes: number): Promise<string>;
  sha256Hex(input: string): Promise<string>;
  /** Nivel de bloqueo del teléfono: ninguno / PIN, patrón o contraseña / biometría configurada. */
  deviceSecurity(): Promise<DeviceSecurity>;
  /** Verificación del dispositivo CON respaldo de la credencial del teléfono (para crear el PIN). */
  authenticateDevice(): Promise<DeviceAuthResult>;
  /** Verificación SOLO biométrica, sin respaldo de credencial (atajo para entrar y para activarlo). */
  authenticateBiometric(): Promise<DeviceAuthResult>;
  hashIterations?: number;
}

export type LockRecord = {
  v: typeof RECORD_VERSION;
  salt: string;
  hash: string;
  iterations: number;
  /** Errores seguidos desde el último acierto (puede pasar de 5). */
  failed: number;
  /** Hora absoluta (ms) antes de la cual no se prueba el PIN; 0 = sin espera. */
  notBefore: number;
  /** Hora más alta vista (ms): protege contra retroceder el reloj. */
  highWater: number;
  /** Atajo de huella o rostro activado. */
  bio: boolean;
  /** Creado en un teléfono sin bloqueo de pantalla (candado débil). */
  weak: boolean;
};

// ─── Utilidades puras ──────────────────────────────────────────────────────────

/** Comparación sin atajos: recorre todo el texto aunque ya haya una diferencia. */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** m:ss para la cuenta regresiva de la espera. */
export function formatWait(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Espera que corresponde tras `failed` errores seguidos (0 si todavía no toca). */
export function waitForFailures(failed: number): number {
  if (failed < FREE_ATTEMPTS) return 0;
  const step = Math.min(failed - FREE_ATTEMPTS, WAIT_LADDER_MS.length - 1);
  return WAIT_LADDER_MS[step];
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/**
 * PIN demasiado fáciles de adivinar: un solo dígito repetido (000000), secuencias de 1 en 1 ascendentes o
 * descendentes (123456, 654321, 890123) y patrones que se repiten cada 2 o 3 dígitos (121212, 123123, 112112).
 * Asume formato válido (6 dígitos).
 */
export function isWeakPin(pin: string): boolean {
  const d = pin.split('').map(Number);
  const steps = d.slice(1).map((x, i) => (x - d[i] + 10) % 10);
  if (steps.every((s) => s === 1) || steps.every((s) => s === 9)) return true; // asc / desc (con vuelta 9→0)
  for (const p of [1, 2, 3]) {
    if (d.every((x, i) => i < p || x === d[i - p])) return true; // 000000, 121212, 123123, 112112
  }
  return false;
}

/** ¿Hay que volver a pedir el PIN al volver de segundo plano? Si el reloj retrocedió, sí (falla hacia lo seguro). */
export function shouldRelock(backgroundedAt: number, now: number, limitMs: number = BACKGROUND_RELOCK_MS): boolean {
  if (now < backgroundedAt) return true;
  return now - backgroundedAt >= limitMs;
}

async function derive(deps: LockDeps, pin: string, salt: string, iterations: number): Promise<string> {
  let h = await deps.sha256Hex(`${salt}:${pin}`);
  for (let i = 1; i < iterations; i++) h = await deps.sha256Hex(`${h}:${salt}:${pin}`);
  return h;
}

function parseRecord(raw: string): LockRecord | null {
  try {
    const r = JSON.parse(raw) as Partial<LockRecord> | null;
    if (!r || typeof r !== 'object') return null;
    const okNum = (x: unknown, min: number) => typeof x === 'number' && Number.isFinite(x) && x >= min;
    if (
      r.v !== RECORD_VERSION ||
      typeof r.salt !== 'string' || !r.salt ||
      typeof r.hash !== 'string' || !r.hash ||
      !okNum(r.iterations, 1) || !Number.isInteger(r.iterations) ||
      !okNum(r.failed, 0) || !Number.isInteger(r.failed) ||
      !okNum(r.notBefore, 0) ||
      !okNum(r.highWater, 0) ||
      typeof r.bio !== 'boolean' ||
      typeof r.weak !== 'boolean'
    ) {
      return null;
    }
    return r as LockRecord;
  } catch {
    return null;
  }
}

type Loaded = { kind: 'none' } | { kind: 'bad' } | { kind: 'ok'; rec: LockRecord };

// ─── Resultados ────────────────────────────────────────────────────────────────

export type LockStatus =
  | { state: 'no-pin' }
  | { state: 'unreadable' }
  | { state: 'ready'; bio: boolean; weak: boolean };

export type CreatePinResult =
  | { status: 'ok'; weak: boolean }
  | { status: 'invalid-format' | 'weak-pin' | 'exists' | 'storage-error' }
  | { status: 'device-auth-cancelled' | 'device-auth-failed' | 'device-auth-lockout' | 'device-auth-unavailable' };

export type TryPinResult =
  | { status: 'ok' }
  | { status: 'wrong'; attemptsLeft: number }
  | { status: 'wait'; remainingMs: number }
  | { status: 'no-pin' | 'unreadable' | 'invalid-format' | 'storage-error' | 'error' };

export type BiometricResult =
  | { status: 'ok' }
  | { status: 'no-pin' | 'unreadable' | 'not-enabled' | 'not-available' | 'cancelled' | 'failed' | 'lockout' | 'unavailable' };

export type SetBiometricResult =
  | { status: 'ok' }
  | { status: 'no-pin' | 'unreadable' | 'not-available' | 'cancelled' | 'failed' | 'lockout' | 'unavailable' | 'storage-error' };

const DEVICE_AUTH_STATUS = {
  cancelled: 'device-auth-cancelled',
  failed: 'device-auth-failed',
  lockout: 'device-auth-lockout',
  unavailable: 'device-auth-unavailable',
} as const;

// ─── El candado ────────────────────────────────────────────────────────────────

export function createAdminLock(deps: LockDeps) {
  const iterations = deps.hashIterations ?? DEFAULT_HASH_ITERATIONS;

  // Cola: cada operación espera a la anterior (un intento a la vez).
  let tail: Promise<unknown> = Promise.resolve();
  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = tail.then(fn, fn);
    tail = run.catch(() => undefined);
    return run;
  }

  async function load(): Promise<Loaded> {
    let raw: string | null;
    try {
      raw = await deps.store.read();
    } catch {
      return { kind: 'bad' };
    }
    if (raw === null) return { kind: 'none' };
    const rec = parseRecord(raw);
    return rec ? { kind: 'ok', rec } : { kind: 'bad' };
  }

  const effectiveNow = (rec: LockRecord) => Math.max(deps.now(), rec.highWater);

  async function save(rec: LockRecord): Promise<boolean> {
    try {
      await deps.store.write(JSON.stringify(rec));
      return true;
    } catch {
      return false;
    }
  }

  return {
    status(): Promise<LockStatus> {
      return enqueue(async () => {
        const l = await load();
        if (l.kind === 'none') return { state: 'no-pin' } as const;
        if (l.kind === 'bad') return { state: 'unreadable' } as const;
        return { state: 'ready', bio: l.rec.bio, weak: l.rec.weak } as const;
      });
    },

    /** Milisegundos de espera que quedan (0 si se puede intentar). Solo lectura: para la cuenta regresiva. */
    remainingWaitMs(): Promise<number> {
      return enqueue(async () => {
        const l = await load();
        if (l.kind !== 'ok') return 0;
        return Math.max(0, l.rec.notBefore - effectiveNow(l.rec));
      });
    },

    /**
     * Crea el PIN (la primera vez, y de nuevo después de cerrar sesión). Orden: formato y fuerza (sin pedir nada
     * al sistema) → ¿ya hay registro? → nivel de bloqueo del teléfono → verificación del dispositivo (si hay
     * bloqueo) → escribir. Si la verificación se cancela o falla, el almacenamiento queda intacto.
     */
    createPin(pin: string): Promise<CreatePinResult> {
      return enqueue(async (): Promise<CreatePinResult> => {
        if (!isValidPinFormat(pin)) return { status: 'invalid-format' };
        if (isWeakPin(pin)) return { status: 'weak-pin' };
        if ((await load()).kind !== 'none') return { status: 'exists' };

        let security: DeviceSecurity;
        try {
          security = await deps.deviceSecurity();
        } catch {
          // No se pudo saber: NO se asume "sin bloqueo" (eso abriría la puerta débil), se falla hacia lo seguro.
          return { status: 'device-auth-unavailable' };
        }
        const weak = security === 'none';
        if (!weak) {
          let auth: DeviceAuthResult;
          try {
            auth = await deps.authenticateDevice();
          } catch {
            return { status: 'device-auth-unavailable' };
          }
          if (!auth.ok) return { status: DEVICE_AUTH_STATUS[auth.reason] };
        }

        // Mientras se esperaba la verificación nada más pudo escribir (cola), pero se vuelve a mirar por seguridad.
        if ((await load()).kind !== 'none') return { status: 'exists' };
        try {
          const salt = await deps.randomHex(16);
          const hash = await derive(deps, pin, salt, iterations);
          const rec: LockRecord = {
            v: RECORD_VERSION, salt, hash, iterations,
            failed: 0, notBefore: 0, highWater: deps.now(), bio: false, weak,
          };
          if (!(await save(rec))) return { status: 'storage-error' };
          return { status: 'ok', weak };
        } catch {
          return { status: 'storage-error' };
        }
      });
    },

    /** Prueba un PIN. El intento se guarda ANTES de comparar. */
    tryPin(pin: string): Promise<TryPinResult> {
      return enqueue(async (): Promise<TryPinResult> => {
        const l = await load();
        if (l.kind === 'none') return { status: 'no-pin' };
        if (l.kind === 'bad') return { status: 'unreadable' };
        const rec = l.rec;
        const now = effectiveNow(rec);

        if (rec.notBefore > now) {
          if (now > rec.highWater) await save({ ...rec, highWater: now });
          return { status: 'wait', remainingMs: rec.notBefore - now };
        }
        if (!isValidPinFormat(pin)) return { status: 'invalid-format' };

        const failed = rec.failed + 1;
        const waitMs = waitForFailures(failed);
        const pre: LockRecord = { ...rec, failed, notBefore: waitMs > 0 ? now + waitMs : 0, highWater: now };
        // Si no se puede guardar el intento, no se compara (si no, habría intentos infinitos sin contar).
        if (!(await save(pre))) return { status: 'storage-error' };

        let correct: boolean;
        try {
          correct = safeEqual(await derive(deps, pin, rec.salt, rec.iterations), rec.hash);
        } catch {
          return { status: 'error' }; // el intento ya quedó contado
        }
        if (correct) {
          await save({ ...pre, failed: 0, notBefore: 0 });
          return { status: 'ok' };
        }
        if (waitMs > 0) return { status: 'wait', remainingMs: waitMs };
        return { status: 'wrong', attemptsLeft: FREE_ATTEMPTS - failed };
      });
    },

    /** Atajo de huella o rostro para ENTRAR: solo biometría (sin credencial del teléfono). No toca el contador. */
    tryBiometric(): Promise<BiometricResult> {
      return enqueue(async (): Promise<BiometricResult> => {
        const l = await load();
        if (l.kind === 'none') return { status: 'no-pin' };
        if (l.kind === 'bad') return { status: 'unreadable' };
        if (!l.rec.bio) return { status: 'not-enabled' };
        let security: DeviceSecurity;
        try {
          security = await deps.deviceSecurity();
        } catch {
          return { status: 'unavailable' };
        }
        if (security !== 'biometric') return { status: 'not-available' };
        try {
          const r = await deps.authenticateBiometric();
          return r.ok ? { status: 'ok' } : { status: r.reason };
        } catch {
          return { status: 'unavailable' };
        }
      });
    },

    /** Activa o desactiva el atajo. Activarlo exige que el teléfono tenga biometría y una verificación biométrica. */
    setBiometric(enabled: boolean): Promise<SetBiometricResult> {
      return enqueue(async (): Promise<SetBiometricResult> => {
        const l = await load();
        if (l.kind === 'none') return { status: 'no-pin' };
        if (l.kind === 'bad') return { status: 'unreadable' };
        if (enabled) {
          let security: DeviceSecurity;
          try {
            security = await deps.deviceSecurity();
          } catch {
            return { status: 'unavailable' };
          }
          if (security !== 'biometric') return { status: 'not-available' };
          try {
            const r = await deps.authenticateBiometric();
            if (!r.ok) return { status: r.reason };
          } catch {
            return { status: 'unavailable' };
          }
        }
        return (await save({ ...l.rec, bio: enabled })) ? { status: 'ok' } : { status: 'storage-error' };
      });
    },

    /** Borra el candado de esta cuenta (cerrar sesión). `false` si no se pudo borrar. */
    clear(): Promise<boolean> {
      return enqueue(async () => {
        try {
          await deps.store.remove();
          return true;
        } catch {
          return false;
        }
      });
    },
  };
}

export type AdminLock = ReturnType<typeof createAdminLock>;

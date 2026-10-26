/**
 * Candado local del panel de administración -- conexión con el teléfono (F7-a2, 2026-10-25).
 *
 * La lógica y las reglas viven en adminLockLogic.ts (pura y probada en el computador). Aquí solo se conectan sus
 * piezas externas: SecureStore (registro del PIN, un registro por cuenta), expo-crypto (azar y SHA-256) y
 * expo-local-authentication (nivel de bloqueo del teléfono y verificación del dispositivo).
 *
 * En la web no hay SecureStore: ahí no hay candado (decisión de Pía); las pantallas lo saltan con `lockSupported`.
 */
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
  createAdminLock,
  type AdminLock,
  type DeviceAuthResult,
  type DeviceSecurity,
  type LockDeps,
  type LockStore,
} from './adminLockLogic';

export const lockSupported = Platform.OS !== 'web';

/** Vueltas del hash: el valor va guardado en el registro, así se puede subir después sin romper los PIN existentes. */
const HASH_ITERATIONS = 1000;
const KEY_PREFIX = 'wodplace.adminLock.';

function storeFor(userId: string): LockStore {
  // SecureStore solo acepta letras, números, ".", "-" y "_" en la clave.
  const key = `${KEY_PREFIX}${userId.replace(/[^A-Za-z0-9._-]/g, '_')}`;
  return {
    read: () => SecureStore.getItemAsync(key),
    write: (raw) => SecureStore.setItemAsync(key, raw),
    remove: () => SecureStore.deleteItemAsync(key),
  };
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

export async function getDeviceSecurity(): Promise<DeviceSecurity> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (level === LocalAuthentication.SecurityLevel.NONE) return 'none';
  if (level === LocalAuthentication.SecurityLevel.SECRET) return 'secret';
  return 'biometric'; // BIOMETRIC_WEAK o BIOMETRIC_STRONG
}

function mapAuth(r: LocalAuthentication.LocalAuthenticationResult): DeviceAuthResult {
  if (r.success) return { ok: true };
  switch (r.error) {
    case 'user_cancel':
    case 'app_cancel':
    case 'system_cancel':
    case 'user_fallback':
      return { ok: false, reason: 'cancelled' };
    case 'lockout':
      return { ok: false, reason: 'lockout' };
    case 'not_enrolled':
    case 'not_available':
    case 'passcode_not_set':
    case 'no_space':
      return { ok: false, reason: 'unavailable' };
    default:
      return { ok: false, reason: 'failed' };
  }
}

function depsFor(userId: string): LockDeps {
  return {
    store: storeFor(userId),
    now: () => Date.now(),
    randomHex: async (n) => toHex(Crypto.getRandomValues(new Uint8Array(n))),
    sha256Hex: (s) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, s),
    deviceSecurity: getDeviceSecurity,
    // Para CREAR el PIN: huella, rostro o el desbloqueo del teléfono (con respaldo de la credencial del dispositivo).
    authenticateDevice: async () =>
      mapAuth(
        await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirma que eres tú',
          promptSubtitle: 'Para guardar tu PIN del panel',
          cancelLabel: 'Cancelar',
          disableDeviceFallback: false,
        }),
      ),
    // Atajo para ENTRAR (y para activarlo): solo biometría, SIN la credencial del teléfono.
    authenticateBiometric: async () =>
      mapAuth(
        await LocalAuthentication.authenticateAsync({
          promptMessage: 'Panel de administración',
          promptSubtitle: 'Confirma que eres tú',
          cancelLabel: 'Usar PIN',
          disableDeviceFallback: true,
        }),
      ),
    hashIterations: HASH_ITERATIONS,
  };
}

const locks = new Map<string, AdminLock>();

/** El candado de ESTA cuenta (uno por cuenta; el mismo objeto mientras la app esté abierta, para que la cola sirva). */
export function getAdminLock(userId: string): AdminLock {
  let lock = locks.get(userId);
  if (!lock) {
    lock = createAdminLock(depsFor(userId));
    locks.set(userId, lock);
  }
  return lock;
}

/** Cerrar sesión: borra el candado de esa cuenta (los de otras cuentas del teléfono no se tocan). */
export async function clearAdminLock(userId: string): Promise<boolean> {
  if (!lockSupported) return true;
  const lock = getAdminLock(userId);
  if (await lock.clear()) return true;
  return lock.clear(); // un reintento: si queda el registro, la persona no podría crear un PIN nuevo
}

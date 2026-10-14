import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { decrypt, encrypt, generateKeyHex, looksEncrypted } from './secureSessionCrypto';

/**
 * S2 tanda 2 (auditoría de seguridad, 2026-10-13/14): adaptador de storage
 * para el cliente de Supabase. Patrón documentado por Supabase para React
 * Native: la sesión completa (access + refresh token + metadata) supera el
 * límite de tamaño por valor de SecureStore en Android, así que el blob
 * grande vive en AsyncStorage y solo la clave de cifrado (32 bytes, chica)
 * vive en SecureStore.
 *
 * Migración de primer arranque, sin pasos separados ni perder la sesión:
 * getItem() detecta si el valor guardado es el JSON viejo sin cifrar (no
 * tiene el formato "ivHex:cipherHex") y, si lo es, lo devuelve igual (no
 * bloquea el login/arranque) y de pasada lo vuelve a guardar ya cifrado —
 * la próxima lectura ya lo encuentra cifrado. No hay ventana en la que la
 * sesión exista sin cifrar Y sin cifrar a la vez: siempre se puede leer.
 */
const ENCRYPTION_KEY_NAME = 'wodplace_session_encryption_key';

async function getOrCreateEncryptionKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
  if (existing) return existing;
  const fresh = generateKeyHex();
  await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, fresh);
  return fresh;
}

export const largeSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;

    if (!looksEncrypted(stored)) {
      // Podría ser la sesión vieja sin cifrar (antes de este cambio) -- o
      // podría ser basura que tampoco calza con el formato cifrado. Antes
      // de confiar en ella y devolverla, confirma que es al menos un JSON
      // válido (lo único que Supabase guarda acá); si no lo es, mismo trato
      // que un descifrado fallido: se limpia, nunca se pasa basura al
      // cliente de Supabase.
      try {
        JSON.parse(stored);
      } catch {
        console.warn('[secure-session] valor guardado no es JSON ni está cifrado, se limpia', key);
        await AsyncStorage.removeItem(key);
        return null;
      }
      // Sesión vieja sin cifrar (antes de este cambio, o justo después de
      // un restore de respaldo) — se devuelve tal cual para no desconectar
      // a nadie, y se re-guarda cifrada para la próxima vez.
      if (__DEV__) console.log('[secure-session] migrando sesión sin cifrar a almacenamiento cifrado');
      await largeSecureStore.setItem(key, stored).catch((err) => {
        console.warn('[secure-session] no se pudo migrar la sesión a cifrado (se reintentará)', err);
      });
      return stored;
    }

    try {
      const encryptionKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
      if (!encryptionKey) {
        // Hay un valor cifrado pero no está la clave (SecureStore se borró
        // o el dispositivo cambió) -- no se puede descifrar. Logout limpio,
        // nunca un crash ni un bucle: se limpia el valor y se trata como
        // "no hay sesión", igual que cualquier primer arranque.
        console.warn('[secure-session] falta la clave de cifrado, se trata como sesión inexistente');
        await AsyncStorage.removeItem(key);
        return null;
      }
      return decrypt(stored, encryptionKey);
    } catch (err) {
      // Blob corrupto o clave que no calza -- mismo trato: logout limpio.
      console.warn('[secure-session] no se pudo descifrar la sesión guardada, se limpia', err);
      await AsyncStorage.removeItem(key);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const encryptionKey = await getOrCreateEncryptionKey();
    const encrypted = encrypt(value, encryptionKey);
    await AsyncStorage.setItem(key, encrypted);
  },

  async removeItem(key: string): Promise<void> {
    // La clave de cifrado se deja en SecureStore (no hace daño, y se
    // reutiliza si el usuario vuelve a iniciar sesión en este dispositivo).
    await AsyncStorage.removeItem(key);
  },
};

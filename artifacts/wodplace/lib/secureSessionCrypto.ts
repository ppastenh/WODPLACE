import * as aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';

/**
 * S2 tanda 2 (auditoría de seguridad, 2026-10-13): cifrado AES-256-CTR puro
 * en JS para el patrón de Supabase (clave en SecureStore, blob cifrado en
 * AsyncStorage, porque la sesión supera el límite de tamaño por valor de
 * SecureStore). `aes-js` no tiene bindings nativos — son solo operaciones de
 * bits sobre `Uint8Array`, lo mismo en Hermes que en cualquier motor JS — y
 * el azar viene de `expo-crypto.getRandomValues` (ya parchado en
 * webcrypto-polyfill.ts). Cada llamada a `encrypt` usa un IV nuevo (va
 * guardado junto al texto cifrado, no es secreto) para no reusar nunca el
 * mismo keystream con la misma clave.
 */

const KEY_BYTES = 32; // AES-256
const IV_BYTES = 16;

// Hex, no base64: `btoa`/`atob` no están garantizados en Hermes/React
// Native (a diferencia del navegador) y agregar un polyfill solo para esto
// sería una dependencia más que evitar. aes-js ya trae un codificador hex
// propio (aesjs.utils.hex), sin depender de ningún global del entorno — el
// doble de texto que base64, irrelevante para AsyncStorage (no tiene el
// límite por valor que sí tiene SecureStore).
export function generateKeyHex(): string {
  const key = Crypto.getRandomValues(new Uint8Array(KEY_BYTES));
  return aesjs.utils.hex.fromBytes(key);
}

export function encrypt(plaintext: string, keyHex: string): string {
  const key = aesjs.utils.hex.toBytes(keyHex);
  const iv = Crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const bytes = aesjs.utils.utf8.toBytes(plaintext);
  const ctr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  const encryptedBytes = ctr.encrypt(bytes);
  // iv + ciphertext como hex, separados por ":" (el IV no es secreto, va
  // junto al texto cifrado — solo la clave vive en SecureStore).
  return `${aesjs.utils.hex.fromBytes(iv)}:${aesjs.utils.hex.fromBytes(encryptedBytes)}`;
}

export function decrypt(payload: string, keyHex: string): string {
  const [ivHex, cipherHex] = payload.split(':');
  if (!ivHex || !cipherHex) {
    throw new Error('Formato de sesión cifrada inválido.');
  }
  const key = aesjs.utils.hex.toBytes(keyHex);
  const iv = aesjs.utils.hex.toBytes(ivHex);
  const cipherBytes = aesjs.utils.hex.toBytes(cipherHex);
  const ctr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  const decryptedBytes = ctr.decrypt(cipherBytes);
  return aesjs.utils.utf8.fromBytes(decryptedBytes);
}

/**
 * Chequeo de ida y vuelta, solo __DEV__: prueba que aes-js + la clave de
 * expo-crypto cifran y descifran un texto del tamaño real de una sesión de
 * Supabase (~1KB) dentro del motor JS real de la app (Metro/Hermes), sin
 * necesitar expo-secure-store ni un build nuevo de EAS. Llamarlo una vez
 * desde cualquier punto de arranque es suficiente — ver lib/supabase.ts.
 */
export function devSelfCheckRoundTrip(): void {
  if (!__DEV__) return;
  try {
    const key = generateKeyHex();
    const sample = JSON.stringify({
      access_token: 'x'.repeat(900),
      refresh_token: 'y'.repeat(40),
      user: { id: 'self-check', email: 'self-check@example.com' },
    });
    const encrypted = encrypt(sample, key);
    const decrypted = decrypt(encrypted, key);
    const ok = decrypted === sample;
    console.log(
      '[secure-session-crypto] round-trip',
      ok ? 'OK' : 'FALLÓ',
      '| original:',
      sample.length,
      'bytes | cifrado:',
      encrypted.length,
      'bytes',
    );
    if (!ok) console.warn('[secure-session-crypto] el texto descifrado no coincide con el original');
  } catch (err) {
    console.warn('[secure-session-crypto] round-trip lanzó un error', err);
  }
}

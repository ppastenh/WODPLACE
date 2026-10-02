import * as Crypto from 'expo-crypto';

// React Native's JS engine (Hermes) already provides `crypto.getRandomValues`
// in this project, but not `crypto.subtle` -- without it, supabase-js's PKCE
// code_challenge generation (lib/helpers.js's generatePKCEChallenge) silently
// falls back to the `plain` method (code_challenge === code_verifier, a
// weaker variant of PKCE that RFC 7636 still allows, but that loses PKCE's
// protection if the authorization request URL is ever exposed in transit).
// This polyfills only the one method actually used (`digest`), backed by
// expo-crypto's native implementation -- no extra native module needed since
// expo-crypto was already a transitive dependency.
//
// If the environment ever provides its own `crypto.subtle` (a future Hermes
// version, a different JS engine), this is a no-op -- it never overwrites an
// existing implementation.
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalCrypto: any = globalThis as any;

if (typeof globalCrypto.crypto === 'undefined') {
  globalCrypto.crypto = {};
}

if (!globalCrypto.crypto.subtle) {
  globalCrypto.crypto.subtle = {
    async digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer> {
      const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
      const text = new TextDecoder().decode(bytes);
      const hex = await Crypto.digestStringAsync(algorithm as Crypto.CryptoDigestAlgorithm, text, {
        encoding: Crypto.CryptoEncoding.HEX,
      });
      return hexToArrayBuffer(hex);
    },
  };
}

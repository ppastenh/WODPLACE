import * as Crypto from 'expo-crypto';

// This RN/Hermes version's `crypto` global is incomplete for supabase-js's
// PKCE flow, which needs BOTH of these (confirmed via a full stack trace
// reproduced live -- the first round only caught the `subtle.digest` half):
//   1. generatePKCEVerifier() calls crypto.getRandomValues(array)
//      SYNCHRONOUSLY, no await -- it only checks `typeof crypto ===
//      'undefined'`, never whether getRandomValues itself is a real
//      function, so a `crypto` object that exists but lacks a working
//      getRandomValues throws "undefined is not a function" right there,
//      before code_challenge generation is ever reached.
//   2. generatePKCEChallenge() then hashes that verifier via
//      crypto.subtle.digest('SHA-256', ...) -- same "container exists but
//      the method doesn't" trap.
// Both are patched by checking the METHOD itself, not just its container
// (`crypto` / `crypto.subtle`), so a pre-existing partial/stub
// implementation never gets mistaken for a working one. expo-crypto
// exports both with the exact same signature as their Web Crypto
// counterparts (getRandomValues is synchronous, digest takes/returns the
// same BufferSource/ArrayBuffer shapes), so this is a direct delegation,
// no manual conversion needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalCrypto: any = globalThis as any;

if (typeof globalCrypto.crypto === 'undefined') {
  globalCrypto.crypto = {};
}

const hasRealGetRandomValues = typeof globalCrypto.crypto.getRandomValues === 'function';
console.log('[webcrypto-polyfill] crypto.getRandomValues present before patch:', hasRealGetRandomValues);
if (!hasRealGetRandomValues) {
  globalCrypto.crypto.getRandomValues = Crypto.getRandomValues;
  console.log('[webcrypto-polyfill] patched crypto.getRandomValues');
}

if (typeof globalCrypto.crypto.subtle === 'undefined') {
  globalCrypto.crypto.subtle = {};
}

const hasRealDigest = typeof globalCrypto.crypto.subtle.digest === 'function';
console.log('[webcrypto-polyfill] crypto.subtle.digest present before patch:', hasRealDigest);
if (!hasRealDigest) {
  globalCrypto.crypto.subtle.digest = Crypto.digest;
  console.log('[webcrypto-polyfill] patched crypto.subtle.digest');
}

/**
 * Generates a `wodplace_users.id` in the SAME format the WODPLACE mobile app
 * uses — see `artifacts/wodplace/context/AuthContext.tsx` → `makeId()` — so ids
 * created from this panel and from the app are interchangeable.
 *
 * Deliberately not `crypto.randomUUID()`: it isn't available in every target
 * browser, and these ids are plain text (not UUID columns).
 */
export function makeWodplaceUserId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 9);
}

/**
 * Random-ish token for storage object filenames (NOT an entity id). Avoids
 * `crypto.randomUUID()` for the same browser-compatibility reason.
 */
export function randomKey(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

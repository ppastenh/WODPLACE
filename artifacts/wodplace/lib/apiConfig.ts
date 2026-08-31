import { setBaseUrl } from '@workspace/api-client-react';

/**
 * WODPLACE's backend lives in the shared `artifacts/api-server` service,
 * mounted under the `/api` path on the same domain the Expo dev server
 * injects via EXPO_PUBLIC_DOMAIN (see package.json's `dev` script). Never
 * hardcode $REPLIT_DEV_DOMAIN here — this env var is the portable
 * equivalent that also works once the app is built/published.
 *
 * For fully local development (see the `dev:local` scripts) set
 * EXPO_PUBLIC_API_URL to the api-server's full origin, e.g.
 * `http://localhost:5000`. It wins over EXPO_PUBLIC_DOMAIN and, unlike it,
 * is used verbatim so http and non-standard ports work.
 */
function resolveApiOrigin(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : '';
}

export function configureApiClient(): void {
  // Generated API client paths already include the `/api` prefix (e.g.
  // `/api/contracts`), so the base URL must be just the origin — otherwise
  // requests double up to `/api/api/...` and 404.
  const baseUrl = resolveApiOrigin();
  setBaseUrl(baseUrl || null);
}

/**
 * Builds a fetchable URL for a contract PDF stored via the object storage
 * routes. `objectPath` comes back from the API in the form
 * "/objects/uploads/<uuid>"; the public serving route is mounted at
 * "/storage/objects/*".
 */
export function getContractFileUrl(objectPath: string): string {
  const origin = resolveApiOrigin();
  const base = origin ? `${origin}/api` : '/api';
  const entityPath = objectPath.replace(/^\/objects\//, '');
  // This one intentionally keeps the /api prefix: openBrowserAsync needs a
  // full absolute URL, and this helper builds it directly rather than going
  // through the generated client's baseUrl-prefixed path helpers.
  return `${base}/storage/objects/${entityPath}`;
}

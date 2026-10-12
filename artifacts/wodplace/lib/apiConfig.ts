import { getContractSignedUrl, setBaseUrl } from '@workspace/api-client-react';

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
 * Resolves a contract PDF's fetchable URL. `objectPath` is used ONLY as a
 * local shortcut: older documents (seeded before Fase B) already carry a
 * full Supabase Storage public URL, so there's nothing to call the server
 * for. Anything else lives in the private `contracts` bucket — the server
 * resolves the real file from `slug`/`boxId`/`versionId` itself (never
 * from a path this app sends) and signs a fresh ~5-minute URL, fetched
 * right before opening.
 */
export async function getContractFileUrl(
  objectPath: string,
  args: { userId: string; slug: string; boxId?: string; versionId?: string },
): Promise<string> {
  if (/^https?:\/\//i.test(objectPath)) return objectPath;
  const { url } = await getContractSignedUrl(args);
  return url;
}

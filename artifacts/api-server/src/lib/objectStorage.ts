import { randomUUID } from 'crypto';

import { getSupabaseAdmin } from './supabaseAdmin';

/**
 * Object storage for user-uploaded images (avatars, Comunidad posts) —
 * backed by a public Supabase Storage bucket.
 *
 * Migrated off Replit Object Storage (GCS via a Replit-only sidecar
 * credential exchange at 127.0.0.1:1106), which only works inside a Replit
 * container and can't be run or tested locally.
 *
 * The bucket is public and unauthenticated by design, mirroring the actual
 * behavior of the old setup: a per-object ACL system existed in code
 * (objectAcl.ts) but was never enforced (the auth check in the read route
 * was commented out), and there's no real user auth in wodplace yet to
 * enforce ACLs against anyway — see the SECURITY NOTE in routes/storage.ts.
 */

export const STORAGE_BUCKET = process.env['SUPABASE_STORAGE_BUCKET'] || 'wodplace-uploads';

export class ObjectNotFoundError extends Error {
  constructor() {
    super('Object not found');
    this.name = 'ObjectNotFoundError';
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

function extensionForMime(mimeType: string): string {
  const subtype = mimeType.split('/')[1]?.toLowerCase() ?? '';
  switch (subtype) {
    case 'jpeg':
    case 'jpg':
      return 'jpg';
    case 'png':
      return 'png';
    case 'webp':
      return 'webp';
    case 'gif':
      return 'gif';
    case 'heic':
    case 'heif':
      return 'heic';
    case 'pdf':
      return 'pdf';
    default:
      // Only image/* uploads go through this path without a recognized
      // subtype above; anything else (a stray query string, "octet-stream",
      // etc.) still needs *some* extension, so fall back to a generic one
      // rather than guessing "jpg" for non-image content like the PDFs
      // uploaded by scripts/seed-contracts.ts.
      return subtype.replace(/[^a-z0-9]/g, '') || 'bin';
  }
}

/**
 * Create a fresh signed upload URL under `<prefix>/<uuid>.<ext>` (prefix is
 * e.g. "avatars" or "social"). The URL accepts exactly one direct PUT of the
 * raw image bytes with a `Content-Type` header — no Supabase SDK needed on
 * the client (see lib/api-client-react/src/imageUpload.ts, unchanged by this
 * migration).
 */
export async function createUploadUrl(
  prefix: string,
  contentType: string,
): Promise<{ uploadURL: string; key: string }> {
  const key = `${prefix}/${randomUUID()}.${extensionForMime(contentType)}`;
  const { data, error } = await getSupabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .createSignedUploadUrl(key);
  if (error || !data) {
    throw new Error(`Failed to create signed upload URL: ${error?.message ?? 'unknown error'}`);
  }
  return { uploadURL: data.signedUrl, key };
}

/** Public URL for an object already uploaded under `key`. */
export function getPublicUrl(key: string): string {
  const { data } = getSupabaseAdmin().storage.from(STORAGE_BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

/**
 * Recover the storage key (e.g. "social/<uuid>.jpg") from a public URL
 * previously returned by getPublicUrl — the inverse operation, used at
 * publish time to re-validate what was actually uploaded.
 */
export function keyFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

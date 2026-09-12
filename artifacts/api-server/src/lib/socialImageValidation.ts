import { getPublicUrl, keyFromPublicUrl, ObjectNotFoundError, STORAGE_BUCKET } from './objectStorage';
import { getSupabaseAdmin } from './supabaseAdmin';

/**
 * Validation of social feed images against the ACTUAL uploaded bytes.
 *
 * The presign endpoint cannot enforce anything about what ends up in
 * storage (the client controls the PUT body and headers), so size and
 * content checks must happen here — at publish time, against the stored
 * object's real metadata and magic bytes — before a post referencing the
 * object is accepted.
 */

export const MAX_SOCIAL_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Extract the storage key from a social image URI. Accepts the public
 * Supabase Storage URLs the app is given at upload time; returns null when
 * the URI doesn't point at our own bucket.
 */
export function toObjectPath(uri: string): string | null {
  return keyFromPublicUrl(uri);
}

/** Sniff common image formats from the first bytes of the file. */
function looksLikeImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true;
  // GIF87a / GIF89a
  if (buf.subarray(0, 4).toString('latin1') === 'GIF8') return true;
  // WebP: RIFF....WEBP
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return true;
  // HEIC/HEIF/AVIF: ....ftyp<brand>
  if (buf.subarray(4, 8).toString('latin1') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('latin1');
    return ['heic', 'heix', 'hevc', 'heif', 'mif1', 'msf1', 'avif'].includes(brand);
  }
  // BMP
  if (buf[0] === 0x42 && buf[1] === 0x4d) return true;
  return false;
}

/** Real size of the uploaded object, via the bucket listing (not the client-declared size). */
async function readObjectSize(key: string): Promise<number> {
  const lastSlash = key.lastIndexOf('/');
  const dir = lastSlash === -1 ? '' : key.slice(0, lastSlash);
  const filename = lastSlash === -1 ? key : key.slice(lastSlash + 1);
  const { data, error } = await getSupabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .list(dir, { limit: 1, search: filename });
  if (error || !data || data.length === 0) {
    throw new ObjectNotFoundError();
  }
  return Number(data[0]?.metadata?.['size'] ?? 0);
}

/** First `n` bytes of the object, fetched via HTTP Range against its public URL. */
async function readFirstBytes(key: string, n: number): Promise<Buffer> {
  const response = await fetch(getPublicUrl(key), {
    headers: { Range: `bytes=0-${n - 1}` },
  });
  if (!response.ok && response.status !== 206) {
    throw new ObjectNotFoundError();
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Validate every image URI of a post-to-be against the stored objects.
 * Returns a Spanish, user-facing error message, or null when all are valid.
 */
export async function validateSocialImageUris(
  imageUris: string[],
): Promise<string | null> {
  for (const uri of imageUris) {
    const key = toObjectPath(uri);
    if (!key) {
      return 'Una de las fotos no es válida.';
    }
    let size: number;
    try {
      size = await readObjectSize(key);
    } catch (err) {
      if (err instanceof ObjectNotFoundError) {
        return 'Una de las fotos no se subió correctamente. Intenta de nuevo.';
      }
      throw err;
    }
    if (!Number.isFinite(size) || size <= 0) {
      return 'Una de las fotos quedó vacía. Intenta subirla de nuevo.';
    }
    if (size > MAX_SOCIAL_IMAGE_BYTES) {
      return 'Una de las fotos supera el tamaño máximo de 15 MB.';
    }
    const head = await readFirstBytes(key, 16);
    if (!looksLikeImage(head)) {
      return 'Solo se pueden publicar imágenes.';
    }
  }
  return null;
}

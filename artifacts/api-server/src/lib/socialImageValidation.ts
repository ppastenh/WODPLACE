import {
  ObjectNotFoundError,
  ObjectStorageService,
} from './objectStorage';

import type { File } from '@google-cloud/storage';

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
 * Extract the canonical `/objects/<entityId>` path from a social image URI.
 * Accepts full URLs (as produced by the app: `<base>/api/storage/objects/...`)
 * or already-normalized `/objects/...` paths. Returns null when the URI does
 * not point at our own object storage.
 */
export function toObjectPath(uri: string): string | null {
  let path: string;
  try {
    path = uri.startsWith('http://') || uri.startsWith('https://')
      ? new URL(uri).pathname
      : uri;
  } catch {
    return null;
  }
  const viaApi = path.match(/\/api\/storage\/objects\/(.+)$/);
  if (viaApi) return `/objects/${viaApi[1]}`;
  const direct = path.match(/^\/objects\/(.+)$/);
  if (direct) return `/objects/${direct[1]}`;
  return null;
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

function readFirstBytes(file: File, n: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = file.createReadStream({ start: 0, end: n - 1 });
    stream.on('data', (c: Buffer) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

const objectStorageService = new ObjectStorageService();

/**
 * Validate every image URI of a post-to-be against the stored objects.
 * Returns a Spanish, user-facing error message, or null when all are valid.
 */
export async function validateSocialImageUris(
  imageUris: string[],
): Promise<string | null> {
  for (const uri of imageUris) {
    const objectPath = toObjectPath(uri);
    if (!objectPath) {
      return 'Una de las fotos no es válida.';
    }
    let file: File;
    try {
      file = await objectStorageService.getObjectEntityFile(objectPath);
    } catch (err) {
      if (err instanceof ObjectNotFoundError) {
        return 'Una de las fotos no se subió correctamente. Intenta de nuevo.';
      }
      throw err;
    }
    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size ?? 0);
    if (!Number.isFinite(size) || size <= 0) {
      return 'Una de las fotos quedó vacía. Intenta subirla de nuevo.';
    }
    if (size > MAX_SOCIAL_IMAGE_BYTES) {
      return 'Una de las fotos supera el tamaño máximo de 15 MB.';
    }
    const head = await readFirstBytes(file, 16);
    if (!looksLikeImage(head)) {
      return 'Solo se pueden publicar imágenes.';
    }
  }
  return null;
}

/**
 * Shared PUT-to-presigned-URL logic for the app's two upload flows (social
 * feed images, profile avatars) — both request a presigned URL from
 * api-server, then upload bytes directly to it.
 */

/**
 * Platform-specific uploader for native (iOS/Android).
 *
 * On native, React Native's fetch() cannot read local file:// URIs, and
 * xhr.send({ uri }) only works inside FormData (multipart) — passing a
 * plain object to xhr.send() serialises to "[object Object]", so the
 * storage backend silently stores an empty file while returning HTTP 200.
 *
 * The caller must supply a function that performs a reliable binary PUT
 * (e.g. using expo-file-system/legacy uploadAsync with BINARY_CONTENT).
 * On web this parameter is omitted; the blob:// URI is handled via XHR.
 */
export type NativeUploader = (
  uploadURL: string,
  fileUri: string,
  mimeType: string,
) => Promise<void>;

export async function putImageToPresignedUrl(
  uploadURL: string,
  localUri: string,
  mimeType: string,
  nativeUploader?: NativeUploader,
): Promise<void> {
  if (nativeUploader) {
    await nativeUploader(uploadURL, localUri, mimeType);
    return;
  }
  // Web: localUri is a blob: URL — fetch → Blob → XHR PUT.
  const uploadStatus = await new Promise<number>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadURL);
    xhr.setRequestHeader("Content-Type", mimeType);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) resolve(xhr.status);
    };
    xhr.onerror = () => reject(new Error("Network error during image upload"));
    xhr.ontimeout = () => reject(new Error("Image upload timed out"));
    fetch(localUri)
      .then((r) => r.blob())
      .then((blob) => xhr.send(blob))
      .catch(reject);
  });
  if (uploadStatus < 200 || uploadStatus >= 300) {
    throw new Error(`La imagen no se pudo subir (HTTP ${uploadStatus}). Intenta de nuevo.`);
  }
}

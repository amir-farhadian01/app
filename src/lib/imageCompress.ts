/**
 * Resize image to max longest edge, encode as JPEG. Targets max ~2MB by lowering quality if needed.
 */
export async function compressImageToJpeg(
  file: Blob,
  options?: { maxEdge?: number; quality?: number; maxBytes?: number },
): Promise<Blob> {
  const maxEdge = options?.maxEdge ?? 1600;
  let quality = options?.quality ?? 0.85;
  const maxBytes = options?.maxBytes ?? 2 * 1024 * 1024;

  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;
    const long = Math.max(width, height);
    if (long > maxEdge) {
      const scale = maxEdge / long;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const tryEncode = (q: number) =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('encode failed'))),
          'image/jpeg',
          q,
        );
      });

    let blob = await tryEncode(quality);
    while (blob.size > maxBytes && quality > 0.45) {
      quality -= 0.07;
      blob = await tryEncode(quality);
    }
    return blob;
  } finally {
    bitmap.close();
  }
}

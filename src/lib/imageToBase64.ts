import { resolveMediaUrl } from './resolveMediaUrl';

/**
 * Fetch an image URL (same-origin or CORS-enabled) and return data URL for Gemini inline analysis.
 */
export async function imageUrlToBase64DataUrl(url: string): Promise<{ mimeType: string; data: string }> {
  const absolute = resolveMediaUrl(url);
  const res = await fetch(absolute, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const blob = await res.blob();
  const mimeType = blob.type || 'image/jpeg';
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
  return { mimeType, data: dataUrl };
}

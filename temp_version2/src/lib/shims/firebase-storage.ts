/**
 * firebase/storage shim
 * Routes file uploads to our Express backend (/api/upload).
 */

export function getStorage(_app?: any) { return {}; }
export function connectStorageEmulator() {}

export function ref(_storage: any, path: string) {
  return { _path: path };
}

export async function uploadBytes(ref: any, file: Blob | ArrayBuffer) {
  const formData = new FormData();
  formData.append('file', file instanceof Blob ? file : new Blob([file]));
  formData.append('path', ref._path);

  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return { ref };
}

export async function uploadString(ref: any, data: string, format?: string) {
  const blob = new Blob([data]);
  return uploadBytes(ref, blob);
}

export async function getDownloadURL(ref: any): Promise<string> {
  // Return a proxied URL through our backend
  return `/api/files/${encodeURIComponent(ref._path)}`;
}

export async function deleteObject(ref: any): Promise<void> {
  const token = localStorage.getItem('accessToken');
  await fetch(`/api/files/${encodeURIComponent(ref._path)}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export function getMetadata(_ref: any) {
  return Promise.resolve({});
}

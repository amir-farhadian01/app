/** POST /api/upload with XMLHttpRequest for upload progress (percent). */
export function uploadFileWithProgress(file: File, onProgress: (pct: number) => void): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append('file', file);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.min(100, Math.round((100 * e.loaded) / e.total)));
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const j = JSON.parse(xhr.responseText) as { url?: string };
          if (j.url) resolve({ url: j.url });
          else reject(new Error('No URL'));
        } catch {
          reject(new Error('Bad response'));
        }
      } else reject(new Error(xhr.statusText || 'Upload failed'));
    };
    xhr.open('POST', '/api/upload');
    const t = localStorage.getItem('accessToken');
    if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`);
    xhr.send(fd);
  });
}

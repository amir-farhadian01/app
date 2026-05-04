/**
 * Build an absolute URL for uploaded media (paths like `/uploads/...`).
 * Admin may run on a different port than where files were first referenced; optional
 * `import.meta.env.VITE_API_PUBLIC_ORIGIN` (e.g. http://localhost:8077) forces that host for relative paths.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (url == null || url === '') return '';
  const u = String(url).trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const path = u.startsWith('/') ? u : `/${u}`;
  const envOrigin =
    (typeof import.meta !== 'undefined' &&
      (import.meta as ImportMeta).env &&
      ((import.meta as ImportMeta).env as Record<string, string | undefined>).VITE_API_PUBLIC_ORIGIN?.replace(
        /\/$/,
        '',
      )) ||
    '';
  const base = envOrigin || (typeof window !== 'undefined' ? window.location.origin : '');
  return base ? `${base}${path}` : path;
}

/** Port for the admin-only host (must match .env `ADMIN_PORT` and `VITE_ADMIN_PORT`). */
const DEFAULT_ADMIN = '9090';
/** Main customer + API port (must match .env `PORT` and `VITE_APP_PORT` for correct redirects). */
const DEFAULT_MAIN = '8077';

export function getAdminPanelPort(): string {
  return (import.meta.env.VITE_ADMIN_PORT as string) || DEFAULT_ADMIN;
}

/** Main public app port (customer React + same-origin API in dev). */
export function getMainAppPort(): string {
  return (import.meta.env.VITE_APP_PORT as string) || DEFAULT_MAIN;
}

export function getAdminPanelOrigin(): string {
  if (typeof window === 'undefined') {
    return `http://localhost:${getAdminPanelPort()}`;
  }
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${getAdminPanelPort()}`;
}

export function getMainAppOrigin(): string {
  if (typeof window === 'undefined') {
    return `http://localhost:${getMainAppPort()}`;
  }
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${getMainAppPort()}`;
}

/** Platform roles that use AdminDashboard — only on the dedicated admin port on the main port they are redirected. */
export function isStaffPlatformRole(role: string | null | undefined): boolean {
  return ['owner', 'platform_admin', 'support', 'finance'].includes(role || '');
}

/** True when the app is open on the dedicated admin port (e.g. :9090), not the main public port. */
export function isAdminPanelPort(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.port === getAdminPanelPort();
}

/** True when the browser is on the main customer/API port (e.g. :8077). */
export function isMainAppPort(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.location.port;
  return w === getMainAppPort();
}

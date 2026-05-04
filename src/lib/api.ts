// Central HTTP client — replaces Firebase SDK calls

const BASE = '';

export interface ApiUser {
  id: string;
  email: string;
  displayName: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  status: string;
  companyId: string | null;
  isVerified: boolean;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  address?: string | null;
  phone: string | null;
  googleLinked?: boolean;
  mfaEnabled?: boolean;
  createdAt: string;
}

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

/** Raw multipart upload (not JSON). Returns public URL path e.g. `/uploads/...` */
export async function uploadBinary(file: File | Blob, filename: string): Promise<string> {
  const toFd = () => {
    const body =
      file instanceof File
        ? file
        : new File([file], filename, { type: file.type || 'application/octet-stream' });
    const fd = new FormData();
    fd.append('file', body);
    return fd;
  };

  const post = async (token: string | null) => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${BASE}/api/upload`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: toFd(),
    });
  };

  let res = await post(getToken());
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await post(newToken);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Upload failed');
  }
  const data = await res.json();
  return data.url as string;
}

export function setToken(token: string) {
  localStorage.setItem('accessToken', token);
}

export function clearToken() {
  localStorage.removeItem('accessToken');
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    setToken(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: any,
  retry = true,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) return request<T>(method, path, body, false);
    clearToken();
    // ADR-0054: never hard-redirect the tab for unauthenticated /auth/me (guest flows, boot probes).
    // Other endpoints may still send users to sign-in after a failed refresh.
    if (path !== '/api/auth/me') {
      window.location.href = '/auth';
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const e = new Error(
      (typeof (err as { error?: string }).error === 'string' && (err as { error: string }).error) ||
        'Request failed',
    ) as Error & { status: number; body: unknown };
    e.status = res.status;
    e.body = err;
    throw e;
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: any) => request<T>('POST', path, body),
  put: <T>(path: string, body?: any) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: any) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),

  // Auth
  register: (email: string, password: string, displayName: string, role?: string, phone?: string) =>
    request<{ accessToken: string; user: ApiUser }>('POST', '/api/auth/register', {
      email,
      password,
      displayName,
      role,
      phone,
    }),
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: ApiUser }>('POST', '/api/auth/login', { email, password }),
  forgotPassword: (email: string) =>
    request<{ success: boolean }>('POST', '/api/auth/forgot-password', { email }),
  resetPassword: (email: string, newPassword: string) =>
    request<{ success: boolean }>('POST', '/api/auth/reset-password', { email, newPassword }),
  googleLogin: (idToken: string) =>
    request<{ accessToken: string; user: ApiUser }>('POST', '/api/auth/google', { idToken }),
  logout: () => request<void>('POST', '/api/auth/logout'),
  me: () => request<ApiUser>('GET', '/api/auth/me'),
};

export default api;

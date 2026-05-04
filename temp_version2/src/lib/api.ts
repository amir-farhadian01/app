// Central HTTP client — replaces Firebase SDK calls

const BASE = '';

export interface ApiUser {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  status: string;
  companyId: string | null;
  isVerified: boolean;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  createdAt: string;
}

function getToken(): string | null {
  return localStorage.getItem('accessToken');
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
    window.location.href = '/auth';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: any) => request<T>('POST', path, body),
  put: <T>(path: string, body?: any) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),

  // Auth
  register: (email: string, password: string, displayName: string, role?: string) =>
    request<{ accessToken: string; user: ApiUser }>('POST', '/api/auth/register', { email, password, displayName, role }),
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: ApiUser }>('POST', '/api/auth/login', { email, password }),
  googleLogin: (idToken: string) =>
    request<{ accessToken: string; user: ApiUser }>('POST', '/api/auth/google', { idToken }),
  logout: () => request<void>('POST', '/api/auth/logout'),
  me: () => request<ApiUser>('GET', '/api/auth/me'),
};

export default api;

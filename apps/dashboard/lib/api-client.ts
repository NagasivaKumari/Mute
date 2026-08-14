const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sentinel_access_token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sentinel_refresh_token');
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem('sentinel_access_token', access);
  localStorage.setItem('sentinel_refresh_token', refresh);
}

export function clearTokens(): void {
  localStorage.removeItem('sentinel_access_token');
  localStorage.removeItem('sentinel_refresh_token');
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const json = await res.json();
  if (json.success) {
    setTokens(json.data.accessToken, json.data.refreshToken);
    return json.data.accessToken;
  }
  clearTokens();
  return null;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && getRefreshToken()) {
    token = await refreshAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }

  const json = await res.json();
  if (!json.success) {
    throw new ApiError(json.error?.code ?? 'UNKNOWN', json.error?.message ?? 'Request failed');
  }
  return json.data as T;
}

export { API_URL };

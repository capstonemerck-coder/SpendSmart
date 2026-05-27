/**
 * SpendSmart API client.
 *
 * Thin fetch wrapper that:
 * - Prefixes all calls with VITE_API_BASE_URL (default: http://localhost:8000/api/v1)
 * - Injects Authorization: Bearer <token> from localStorage
 * - Throws structured ApiError on non-2xx responses
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public errorType?: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  return localStorage.getItem('spendsmart_token');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    ...options,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    let errorType: string | undefined;
    try {
      const json = await res.json();
      detail = json.detail ?? detail;
      errorType = json.error_type;
    } catch {
      /* ignore json parse errors */
    }
    throw new ApiError(res.status, detail, errorType);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
  postForm: <T>(path: string, form: FormData) => request<T>('POST', path, form),
};

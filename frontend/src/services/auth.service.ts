/**
 * Authentication service.
 * Wraps /auth/* endpoints and manages token + user state in localStorage.
 */
import { api, ApiError } from './api-client';

export interface AuthUser {
  user_id: number;
  username: string;
  role: string;
  permissions: string[];
  access_token: string;
}

const TOKEN_KEY = 'spendsmart_token';
const USER_KEY  = 'spendsmart_user';

export const authService = {
  /** Login with username + password. Stores token in localStorage. */
  async login(username: string, password: string): Promise<AuthUser> {
    const data = await api.post<AuthUser>('/auth/login', { username, password });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data));
    return data;
  },

  /** Clear session. */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /** Return stored user without a network call. */
  getStoredUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  },

  /** Verify token by hitting /auth/me. */
  async me(): Promise<AuthUser | null> {
    try {
      return await api.get<AuthUser>('/auth/me');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        authService.logout();
      }
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },
};

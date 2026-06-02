/**
 * auth.service.ts
 *
 * Handles all API communication for authentication.
 * Manages JWT storage in localStorage and exposes login, logout,
 * session restoration, and token validation against the backend.
 *
 * Token storage keys:
 *   spendsmart_token — raw JWT string
 *   spendsmart_user  — serialised AuthUser object (cached profile)
 */
import { api, ApiError } from './api-client';

export interface AuthUser {
  user_id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  region: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  permissions: string[];
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  username: string;
  role: string;
  permissions: string[];
}

const TOKEN_KEY = 'spendsmart_token';
const USER_KEY = 'spendsmart_user';

export const authService = {
  /**
   * Authenticate with email and password.
   *
   * Step 1: POST /auth/login to obtain a JWT.
   * Step 2: Store the token in localStorage.
   * Step 3: GET /auth/me to fetch the full user profile (includes full_name, region, etc.).
   * Step 4: Cache the profile in localStorage and return it.
   *
   * @param email    - User's email address.
   * @param password - User's plaintext password (only sent over HTTPS).
   * @returns Full user profile including role and screen permissions.
   * @throws ApiError with status 401 if credentials are invalid.
   * @throws ApiError with status 403 if the account is deactivated.
   */
  async login(email: string, password: string): Promise<AuthUser> {
    const tokenData = await api.post<TokenResponse>('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, tokenData.access_token);
    const user = await api.get<AuthUser>('/auth/me');
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },

  /**
   * Clear the stored JWT and cached user profile from localStorage.
   * Stateless JWT — no server-side session invalidation required.
   */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Return the cached user profile from localStorage without a network call.
   * Used to hydrate UI state immediately on page load, before /me validation finishes.
   *
   * @returns Cached AuthUser or null if not logged in.
   */
  getStoredUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  },

  /**
   * Validate the stored token by calling GET /auth/me.
   * Updates the cached user profile if the token is still valid.
   * Clears localStorage and returns null if the token is invalid or expired.
   *
   * @returns Fresh user profile from the server, or null if session is invalid.
   */
  async me(): Promise<AuthUser | null> {
    try {
      const user = await api.get<AuthUser>('/auth/me');
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        authService.logout();
      }
      return null;
    }
  },

  /**
   * Check whether a JWT token is present in localStorage.
   * Does not validate the token — call me() for that.
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },
};

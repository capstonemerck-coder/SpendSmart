/**
 * AuthContext.tsx
 *
 * Provides global authentication state for the SpendSmart application.
 *
 * On mount, validates any stored JWT via GET /auth/me and restores the
 * user session automatically. Sets isLoading = true during this check so
 * the rest of the app can gate rendering until the session state is known.
 *
 * Exposes:
 *   currentUser   — authenticated user profile (null if logged out)
 *   isLoading     — true while the initial session check is in progress
 *   login()       — async: authenticates and sets currentUser
 *   logout()      — clears session and sets currentUser to null
 *   hasPermission()— checks whether the current user may access a screen
 *   isAuthenticated — derived boolean
 *   isAdmin       — true if role === 'admin'
 *   isAnalyst     — true if role === 'brand intelligence analyst'
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { ScreenPermission } from '@/utils/types';
import { authService, type AuthUser } from '@/services/auth.service';

interface AuthContextValue {
  currentUser: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (screen: ScreenPermission) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore the session if a token is present in localStorage.
  // isLoading stays true until /me completes so the shell can show a loading screen.
  useEffect(() => {
    const restoreSession = async () => {
      if (!authService.isAuthenticated()) {
        setIsLoading(false);
        return;
      }
      const user = await authService.me();
      setCurrentUser(user);
      setIsLoading(false);
    };
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const user = await authService.login(email, password);
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
  }, []);

  /**
   * Check whether the current user has access to a given screen.
   * Admins bypass all permission checks — they can access every screen.
   */
  const hasPermission = useCallback(
    (screen: ScreenPermission) => {
      if (!currentUser) return false;
      if (currentUser.role === 'admin') return true;
      return currentUser.permissions.includes(screen);
    },
    [currentUser],
  );

  const value: AuthContextValue = {
    currentUser,
    isLoading,
    login,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth — access authentication state and computed role flags from any component.
 *
 * Returns all AuthContext values plus:
 *   isAuthenticated — true when currentUser is set
 *   isAdmin         — true when role === 'admin'
 *   isAnalyst       — true when role === 'brand intelligence analyst'
 *
 * Must be used within <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return {
    ...ctx,
    isAuthenticated: !!ctx.currentUser,
    isAdmin: ctx.currentUser?.role === 'admin',
    isAnalyst: ctx.currentUser?.role === 'brand intelligence analyst',
  };
}

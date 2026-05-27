import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { User, ScreenPermission, Role } from '@/utils/types';
import { ALL_SCREENS } from '@/utils/types';

const ROLE_PERMISSIONS: Record<Role, ScreenPermission[]> = {
  admin: [],
  'data scientist': ['DATA INPUT', 'DATA HISTORY', 'MODEL SUMMARY'],
  'brand intelligence analyst': ALL_SCREENS,
  leadership: ['SCENARIO PLANNING', 'SCENARIO OUTCOME', 'SCENARIO COMPARISONS'],
};

const SEED_USERS: User[] = [
  {
    id: 'u-admin',
    username: 'admin',
    password: 'admin123',
    fullName: 'Site Administrator',
    region: 'US',
    role: 'admin',
    permissions: [],
    createdAt: '2025-01-01',
    active: true,
  },
  {
    id: 'u-analyst',
    username: 'analyst',
    password: 'analyst123',
    fullName: 'Maya Analyst',
    region: 'Asia Pacific',
    role: 'brand intelligence analyst',
    permissions: ALL_SCREENS,
    createdAt: '2025-02-14',
    active: true,
  },
  {
    id: 'u-scientist',
    username: 'scientist',
    password: 'scientist123',
    fullName: 'Sam Data',
    region: 'CER',
    role: 'data scientist',
    permissions: ['DATA INPUT', 'DATA HISTORY', 'MODEL SUMMARY'],
    createdAt: '2025-03-02',
    active: true,
  },
];

interface AuthContextValue {
  currentUser: User | null;
  users: User[];
  login: (username: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  createUser: (data: Omit<User, 'id' | 'createdAt'>) => { ok: true } | { ok: false; error: string };
  updateUser: (id: string, patch: Partial<User>) => void;
  deleteUser: (id: string) => void;
  setUserPermissions: (id: string, permissions: ScreenPermission[]) => void;
  setUserRole: (id: string, role: Role) => void;
  setUserActive: (id: string, active: boolean) => void;
  hasPermission: (screen: ScreenPermission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(SEED_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login: AuthContextValue['login'] = useCallback(
    (username, password) => {
      const u = users.find(
        (x) => x.username.toLowerCase() === username.toLowerCase() && x.password === password,
      );
      if (!u) return { ok: false, error: 'Invalid username or password.' };
      if (!u.active) return { ok: false, error: 'This account is deactivated. Contact your admin.' };
      setCurrentUser(u);
      return { ok: true };
    },
    [users],
  );

  const logout = useCallback(() => setCurrentUser(null), []);

  const createUser: AuthContextValue['createUser'] = useCallback(
    (data) => {
      if (!data.username.trim()) return { ok: false, error: 'Username is required.' };
      if (!data.password.trim()) return { ok: false, error: 'Password is required.' };
      if (users.some((u) => u.username.toLowerCase() === data.username.toLowerCase())) {
        return { ok: false, error: `Username "${data.username}" already exists.` };
      }
      const newUser: User = {
        ...data,
        id: `u-${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setUsers((prev) => [...prev, newUser]);
      return { ok: true };
    },
    [users],
  );

  const updateUser = useCallback((id: string, patch: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    setCurrentUser((cu) => (cu && cu.id === id ? { ...cu, ...patch } : cu));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const setUserPermissions = useCallback(
    (id: string, permissions: ScreenPermission[]) => updateUser(id, { permissions }),
    [updateUser],
  );

  const setUserRole = useCallback(
    (id: string, role: Role) =>
      updateUser(id, {
        role,
        permissions: ROLE_PERMISSIONS[role],
      }),
    [updateUser],
  );

  const setUserActive = useCallback(
    (id: string, active: boolean) => updateUser(id, { active }),
    [updateUser],
  );

  const hasPermission = useCallback(
    (screen: ScreenPermission) => {
      if (!currentUser) return false;
      return currentUser.permissions.includes(screen);
    },
    [currentUser],
  );

  const value: AuthContextValue = {
    currentUser,
    users,
    login,
    logout,
    createUser,
    updateUser,
    deleteUser,
    setUserPermissions,
    setUserRole,
    setUserActive,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}

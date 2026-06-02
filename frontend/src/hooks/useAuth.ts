/**
 * useAuth.ts
 *
 * Convenience re-export of the useAuth hook from AuthContext.
 *
 * Exposes:
 *   currentUser     — authenticated AuthUser | null
 *   isLoading       — true while the initial session check is in progress
 *   login()         — async: authenticates with email + password
 *   logout()        — clears session
 *   hasPermission() — checks screen-level access for the current user
 *   isAuthenticated — true when currentUser is set
 *   isAdmin         — true when role === 'admin'
 *   isAnalyst       — true when role === 'brand intelligence analyst'
 *
 * Usage:
 *   import { useAuth } from '@/hooks/useAuth'
 *   or
 *   import { useAuth } from '@/context/AuthContext'
 */
export { useAuth } from '@/context/AuthContext';

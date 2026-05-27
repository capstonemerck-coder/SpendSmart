// ============================================================================
// Scenario types
// ============================================================================

export interface Constraint {
  channel: string;
  subChannel: string;
  roi: string;
  currentSpend: string;
  minSpendPercent: number;
  maxSpendPercent: number;
}

export interface Scenario {
  id: string;
  name: string;
  type: string;
  status: string;
  constraints: Constraint[];
  categoryConstraint: string;
  isPublic?: boolean;
  targetSpend?: string;
  targetKPI?: string;
  targetValue?: string;
}

// ============================================================================
// Auth & RBAC types
// ============================================================================

export type Role =
  | 'admin'
  | 'data scientist'
  | 'brand intelligence analyst'
  | 'leadership';

/**
 * All possible screens / modules in the app.
 * Mirrors the `Tab` union from NavBar.tsx so permissions and tabs stay aligned.
 */
export type ScreenPermission =
  | 'DATA INPUT'
  | 'DATA HISTORY'
  | 'MODEL SUMMARY'
  | 'SCENARIO PLANNING'
  | 'SCENARIO OUTCOME'
  | 'SCENARIO COMPARISONS';

export const ALL_SCREENS: ScreenPermission[] = [
  'DATA INPUT',
  'DATA HISTORY',
  'MODEL SUMMARY',
  'SCENARIO PLANNING',
  'SCENARIO OUTCOME',
  'SCENARIO COMPARISONS',
];

export interface User {
  id: string;
  username: string;
  password: string; // demo only — never store plaintext in production
  fullName: string;
  email?: string;
  region?: string;
  role: Role;
  permissions: ScreenPermission[];
  createdAt: string;
  active: boolean;
}

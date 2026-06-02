/**
 * AdminDashboard
 *
 * Admin-only screen for managing user accounts.
 * Displays all users in a searchable table with actions to create, delete,
 * and update users. Uses the useAdminUsers hook for all API operations.
 */
import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Shield, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAdminUsers, type CreateUserPayload } from '@/hooks/useAdminUsers';
import { ALL_SCREENS } from '@/utils/types';
import type { ScreenPermission, User } from '@/utils/types';
import { PageContainer, PageHeader, Card } from '@/components/shared';
import { LoadingState } from '@/components/shared/feedback/LoadingState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const { users, loading, error, createUser, deleteUser, reload } = useAdminUsers();

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.full_name ?? '').toLowerCase().includes(q) ||
        (u.region ?? '').toLowerCase().includes(q),
    );
  }, [users, search]);

  if (loading) return <LoadingState message="Loading users…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Admin"
        title="User management"
        description="Manage user accounts, roles and screen permissions."
      />

      {/* User table card */}
      <Card>
        {/* Card header */}
        <div className="ui-card-header">
          <div>
            <p className="text-[14px] font-semibold text-[var(--ink-900)]">Users</p>
            <p className="text-[12px] text-[var(--ink-500)] mt-0.5">
              {users.length} total accounts
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-[var(--ink-400)] pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users…"
                className="ui-input !pl-10 !pr-3 w-52 text-[12px] !h-[36px]"
              />
            </div>
            {/* New user button */}
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 bg-[var(--brand)] hover:bg-[var(--brand-600)] text-white text-[12px] font-semibold px-3.5 h-[36px] rounded-md transition-colors"
            >
              <Plus size={13} /> New user
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)]">
                {['User', 'Region', 'Role', 'Created', ''].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--ink-500)] ${h === '' ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSelf = currentUser?.user_id === u.user_id;
                const isAdmin = u.role === 'admin';
                const displayName = u.full_name ?? u.username;
                return (
                  <tr key={u.user_id} className="border-b border-[var(--border)] hover:bg-[var(--surface-subtle)] transition-colors">
                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${isAdmin ? 'bg-[var(--ink-900)] text-white' : 'bg-[var(--brand-100)] text-[var(--brand-700)]'}`}>
                          {displayName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-[var(--ink-900)]">{displayName}</div>
                          <div className="text-[11px] text-[var(--ink-400)]">@{u.username}</div>
                        </div>
                      </div>
                    </td>

                    {/* Region */}
                    <td className="px-5 py-3.5 text-[12px] text-[var(--ink-500)]">{u.region || '—'}</td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      {isAdmin ? (
                        <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--ink-700)] bg-[var(--ink-50)] px-3 py-1.5 rounded-md">
                          <Shield size={12} className="text-[var(--ink-900)]" /> Admin
                        </div>
                      ) : (
                        <div className="text-[12px] font-medium text-[var(--ink-700)] capitalize">
                          {u.role}
                        </div>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-5 py-3.5 text-[12px] text-[var(--ink-400)]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>

                    {/* Delete */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        disabled={isSelf || isAdmin}
                        onClick={async () => {
                          if (window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) {
                            try {
                              await deleteUser(u.user_id);
                            } catch {
                              window.alert('Failed to delete user. Please try again.');
                            }
                          }
                        }}
                        className={`text-[var(--ink-300)] hover:text-[var(--danger)] transition-colors ${isSelf || isAdmin ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title={isSelf ? "You can't delete yourself" : isAdmin ? 'Admin cannot be deleted' : 'Delete user'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-14 text-[13px] text-[var(--ink-400)]">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {createOpen && (
        <CreateUserModal
          onClose={() => setCreateOpen(false)}
          onSubmit={async (payload) => {
            const err = await createUser(payload);
            if (!err) setCreateOpen(false);
            return err;
          }}
        />
      )}
    </PageContainer>
  );
}

// ── Create User Modal ─────────────────────────────────────────────────────────

interface CreateUserModalProps {
  onClose: () => void;
  onSubmit: (payload: CreateUserPayload) => Promise<string | null>;
}

function CreateUserModal({ onClose, onSubmit }: CreateUserModalProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('US');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('data scientist');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!username.trim()) { setError('Username is required.'); return; }
    if (!password) { setError('Password is required.'); return; }

    setSubmitting(true);
    const err = await onSubmit({
      username: username.trim(),
      password,
      full_name: fullName.trim() || username.trim(),
      email: email.trim() || undefined,
      region: region || undefined,
      role,
    });
    setSubmitting(false);
    if (err) setError(err);
  };

  const roleHint: Record<string, string> = {
    'data scientist': 'Access to: Data Input, Data History, Model Summary',
    'brand intelligence analyst': 'Access to: All screens',
    leadership: 'Access to: Scenario Planning, Scenario Outcome, Scenario Comparisons',
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="ui-card-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[var(--brand)] rounded-md flex items-center justify-center">
              <UserIcon size={15} className="text-white" />
            </div>
            <p className="text-[14px] font-semibold text-[var(--ink-900)]">Create new user</p>
          </div>
          <button onClick={onClose} className="text-[var(--ink-400)] hover:text-[var(--ink-700)]">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Full name">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="ui-input" placeholder="e.g. Maya Analyst" />
            </ModalField>
            <ModalField label="Username *">
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="ui-input" placeholder="e.g. mpatel" />
            </ModalField>
            <ModalField label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="ui-input" placeholder="you@merck.com" />
            </ModalField>
            <ModalField label="Password *">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="ui-input" placeholder="••••••••" />
            </ModalField>
            <ModalField label="Region">
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="ui-input">
                <option value="US">US</option>
                <option value="Asia Pacific">Asia Pacific</option>
                <option value="CER">CER</option>
              </select>
            </ModalField>
          </div>

          <ModalField label="Role">
            <select value={role} onChange={(e) => setRole(e.target.value)} className="ui-input">
              <option value="data scientist">Data Scientist</option>
              <option value="brand intelligence analyst">Brand Intelligence Analyst</option>
              <option value="leadership">Leadership</option>
            </select>
            <p className="text-[11px] text-[var(--ink-500)] mt-2">{roleHint[role]}</p>
          </ModalField>

          {error && (
            <div className="border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-[12px] text-[var(--danger)] rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] rounded-b-2xl flex justify-end gap-2">
          <button onClick={onClose} disabled={submitting} className="border border-[var(--border-strong)] px-4 py-2 text-[12px] font-medium text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] rounded-md transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="bg-[var(--brand)] hover:bg-[var(--brand-600)] text-white px-5 py-2 text-[12px] font-semibold rounded-md transition-colors disabled:opacity-50">
            {submitting ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Permissions Modal (read-only view — permissions are role-derived) ─────────

function PermissionsModal({ user, onClose }: { user: User; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] max-w-md w-full">
        <div className="ui-card-header">
          <div>
            <p className="text-[14px] font-semibold text-[var(--ink-900)]">Screen permissions</p>
            <p className="text-[11px] text-[var(--ink-400)] mt-0.5">
              {user.full_name ?? user.username} · @{user.username}
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--ink-400)] hover:text-[var(--ink-700)]">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <p className="ui-eyebrow mb-3">Granted screens</p>
          <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
            {ALL_SCREENS.map((s) => {
              const granted = user.permissions.includes(s);
              return (
                <div key={s} className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] text-[var(--ink-800)]">{s}</span>
                  <span className={`text-[11px] font-medium ${granted ? 'text-[var(--success)]' : 'text-[var(--ink-300)]'}`}>
                    {granted ? 'Granted' : 'Restricted'}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[var(--ink-400)] mt-3">
            Permissions are role-based. To change access, update the user's role.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] rounded-b-2xl flex justify-end">
          <button onClick={onClose} className="border border-[var(--border-strong)] px-4 py-2 text-[12px] font-medium text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] rounded-md transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="ui-eyebrow mb-1.5">{label}</p>
      {children}
    </div>
  );
}

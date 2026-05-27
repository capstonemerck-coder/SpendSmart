//admin-dashboard
import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Shield, User as UserIcon, X, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ALL_SCREENS } from '@/utils/types';
import type { ScreenPermission, User, Role } from '@/utils/types';
import { PageContainer, PageHeader, Card } from '@/components/shared';

export default function AdminDashboard() {
  const {
    currentUser,
    users,
    createUser,
    deleteUser,
    setUserPermissions,
    setUserRole,
    setUserActive,
  } = useAuth();

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.region?.toLowerCase().includes(q),
    );
  }, [users, search]);

  const editingUser = users.find((u) => u.id === editingId) || null;

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === 'admin').length,
      active: users.filter((u) => u.active).length,
      inactive: users.filter((u) => !u.active).length,
    }),
    [users],
  );

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
                const isSelf = currentUser?.id === u.id;
                const isAdmin = u.role === 'admin';
                return (
                  <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-subtle)] transition-colors">
                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${isAdmin ? 'bg-[var(--ink-900)] text-white' : 'bg-[var(--brand-100)] text-[var(--brand-700)]'}`}>
                          {u.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-[var(--ink-900)]">{u.fullName}</div>
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
                    <td className="px-5 py-3.5 text-[12px] text-[var(--ink-400)]">{u.createdAt}</td>

                    {/* Delete */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        disabled={isSelf || isAdmin}
                        onClick={() => {
                          if (window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) {
                            deleteUser(u.id);
                          }
                        }}
                        className={`text-[var(--ink-300)] hover:text-[var(--danger)] transition-colors ${isSelf || isAdmin ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title={isSelf ? "You can't delete yourself" : isAdmin ? "Admin cannot be deleted" : 'Delete user'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-[13px] text-[var(--ink-400)]">
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
          onSubmit={(data) => {
            const r = createUser(data);
            if (r.ok) { setCreateOpen(false); return null; }
            return r.error;
          }}
        />
      )}

      {editingUser && (
        <PermissionsModal
          user={editingUser}
          onClose={() => setEditingId(null)}
          onSave={(perms) => { setUserPermissions(editingUser.id, perms); setEditingId(null); }}
        />
      )}
    </PageContainer>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'success' | 'danger' }) {
  const valueColor =
    accent === 'success' ? 'text-[var(--success)]'
    : accent === 'danger' ? 'text-[var(--danger)]'
    : 'text-[var(--ink-900)]';
  return (
    <div className="ui-card p-5">
      <p className="ui-eyebrow mb-2">{label}</p>
      <p className={`text-[30px] font-semibold leading-none font-display ${valueColor}`}>{value}</p>
    </div>
  );
}

// ── Create User Modal ─────────────────────────────────────────────────────────

interface CreateUserModalProps {
  onClose: () => void;
  onSubmit: (data: Omit<User, 'id' | 'createdAt'>) => string | null;
}

function CreateUserModal({ onClose, onSubmit }: CreateUserModalProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [region, setRegion] = useState<string>('US');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('data scientist');
  const [permissions, setPermissions] = useState<ScreenPermission[]>(['DATA INPUT', 'DATA HISTORY', 'MODEL SUMMARY']);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    // Auto-set permissions based on role
    if (newRole === 'data scientist') {
      setPermissions(['DATA INPUT', 'DATA HISTORY', 'MODEL SUMMARY']);
    } else if (newRole === 'brand intelligence analyst') {
      setPermissions([...ALL_SCREENS]);
    } else if (newRole === 'leadership') {
      setPermissions(['SCENARIO PLANNING', 'SCENARIO OUTCOME', 'SCENARIO COMPARISONS']);
    }
  };

  const togglePermission = (p: ScreenPermission) =>
    setPermissions((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const handleSubmit = () => {
    setError(null);
    const err = onSubmit({
      fullName: fullName.trim() || username.trim(),
      username: username.trim(),
      region,
      password,
      role,
      permissions,
      active: true,
    });
    if (err) setError(err);
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
          <button onClick={onClose} className="text-[var(--ink-400)] hover:text-[var(--ink-700)]"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
             <ModalField label="Region *">
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="ui-input">
                <option value="US">US</option>
                <option value="Asia Pacific">Asia Pacific</option>
                <option value="CER">CER</option>
              </select>
            </ModalField>
            <ModalField label="Username *">
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="ui-input" placeholder="e.g. mpatel" />
            </ModalField>
           
            <ModalField label="Password *">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="ui-input" placeholder="••••••••" />
            </ModalField>
          </div>

          <ModalField label="Role">
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as Role)}
              className="ui-input"
            >
              <option value="data scientist">Data Scientist</option>
              <option value="brand intelligence analyst">Brand Intelligence Analyst</option>
              <option value="leadership">Leadership</option>
            </select>
            <p className="text-[11px] text-[var(--ink-500)] mt-2">
              {role === 'data scientist'
                ? 'Access to: Data Input, Data History, Model Summary'
                : role === 'leadership'
                ? 'Access to: Scenario Planning, Scenario Outcome, Scenario Comparisons'
                : 'Access to: All screens'}
            </p>
          </ModalField>

          {error && (
            <div className="border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-[12px] text-[var(--danger)] rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] rounded-b-2xl flex justify-end gap-2">
          <button onClick={onClose} className="border border-[var(--border-strong)] px-4 py-2 text-[12px] font-medium text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] rounded-md transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="bg-[var(--brand)] hover:bg-[var(--brand-600)] text-white px-5 py-2 text-[12px] font-semibold rounded-md transition-colors">
            Create user
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Permissions Modal ─────────────────────────────────────────────────────────

function PermissionsModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (p: ScreenPermission[]) => void }) {
  const [selected, setSelected] = useState<ScreenPermission[]>(user.permissions);
  const toggle = (p: ScreenPermission) =>
    setSelected((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  const allSelected = selected.length === ALL_SCREENS.length;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] max-w-md w-full">
        <div className="ui-card-header">
          <div>
            <p className="text-[14px] font-semibold text-[var(--ink-900)]">Screen permissions</p>
            <p className="text-[11px] text-[var(--ink-400)] mt-0.5">{user.fullName} · @{user.username}</p>
          </div>
          <button onClick={onClose} className="text-[var(--ink-400)] hover:text-[var(--ink-700)]"><X size={18} /></button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="ui-eyebrow">Available screens</p>
            <button onClick={() => setSelected(allSelected ? [] : [...ALL_SCREENS])} className="text-[11px] text-[var(--brand)] hover:underline">
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
            {ALL_SCREENS.map((s) => {
              const checked = selected.includes(s);
              return (
                <label key={s} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-subtle)] cursor-pointer" onClick={() => toggle(s)}>
                  <span className="text-[13px] text-[var(--ink-800)]">{s}</span>
                  <span className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-[var(--brand)] border-[var(--brand)]' : 'border-[var(--border-strong)]'}`}>
                    {checked && <Check size={12} className="text-white" />}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-[11px] text-[var(--ink-400)] mt-3">{selected.length} of {ALL_SCREENS.length} screens selected.</p>
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] rounded-b-2xl flex justify-end gap-2">
          <button onClick={onClose} className="border border-[var(--border-strong)] px-4 py-2 text-[12px] font-medium text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] rounded-md transition-colors">
            Cancel
          </button>
          <button onClick={() => onSave(selected)} className="bg-[var(--brand)] hover:bg-[var(--brand-600)] text-white px-5 py-2 text-[12px] font-semibold rounded-md transition-colors">
            Save permissions
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
import { useState } from 'react';
import { Lock, User as UserIcon, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Modal, Button, Input, Label } from '@/components/shared';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = login(username.trim(), password);
    setSubmitting(false);
    if (result.ok) onSuccess();
    else setError(result.error);
  };

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Welcome back"
      subtitle="Enter your credentials to access SpendSmart"
    >
      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
        <div>
          <Label required>Username</Label>
          <div className="relative">
            <UserIcon
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none"
            />
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              placeholder="e.g. admin"
              className="!pl-9"
            />
          </div>
        </div>

        <div>
          <Label required>Password</Label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none"
            />
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="!pl-9 !pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] hover:text-[var(--ink-700)]"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex gap-2 items-start border border-[#FECACA] bg-[var(--danger-bg)] px-3 py-2.5 text-[12.5px] text-[var(--danger)] rounded-md">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>

        {/* Demo creds */}
        <div className="pt-5 mt-2 border-t border-[var(--border)]">
          <div className="ui-eyebrow mb-3">Demo credentials · click to fill</div>
          <div className="grid grid-cols-3 gap-2">
            <DemoCred role="Admin" username="admin" password="admin123" onClick={fillDemo} highlight />
            <DemoCred role="BI Analyst" username="analyst" password="analyst123" onClick={fillDemo} />
            <DemoCred role="Data Scientist" username="scientist" password="scientist123" onClick={fillDemo} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

function DemoCred({
  role,
  username,
  password,
  onClick,
  highlight,
}: {
  role: string;
  username: string;
  password: string;
  onClick: (u: string, p: string) => void;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(username, password)}
      className={`text-left p-2.5 rounded-md border transition-colors ${
        highlight
          ? 'border-[var(--brand-100)] bg-[var(--brand-50)] hover:border-[var(--brand)]'
          : 'border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--ink-400)]'
      }`}
    >
      <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${highlight ? 'text-[var(--brand-700)]' : 'text-[var(--ink-700)]'}`}>
        {role}
      </div>
      <div className="text-[11.5px] text-[var(--ink-700)] font-medium">{username}</div>
      <div className="text-[11px] text-[var(--ink-400)]">{password}</div>
    </button>
  );
}

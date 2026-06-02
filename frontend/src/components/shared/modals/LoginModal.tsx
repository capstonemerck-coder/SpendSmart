import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Modal, Button, Input, Label } from '@/components/shared';
import { ApiError } from '@/services/api-client';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * LoginModal
 *
 * Login form rendered as a modal dialog.
 * Validates email format and password presence before submission.
 * Handles 401 (invalid credentials), 403 (deactivated account), and
 * network failures with distinct, field-level or form-level messages.
 *
 * @param {LoginModalProps} props
 */
export function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validateForm = (): boolean => {
    let valid = true;
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email is required.');
      valid = false;
    } else if (!emailRegex.test(email.trim())) {
      setEmailError('Enter a valid email address.');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setFormError('Invalid email or password.');
        } else if (err.status === 403) {
          setFormError(err.detail);
        } else {
          setFormError('Login failed. Please try again.');
        }
      } else {
        setFormError('Network error. Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Welcome back"
      subtitle="Enter your credentials to access SpendSmart"
    >
      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5" noValidate>
        {/* Email */}
        <div>
          <Label required>Email</Label>
          <div className="relative">
            <Mail
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none"
            />
            <Input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
              autoFocus
              autoComplete="email"
              placeholder="you@merck.com"
              invalid={!!emailError}
              className="!pl-9"
            />
          </div>
          {emailError && (
            <p className="text-[11.5px] text-[var(--danger)] mt-1">{emailError}</p>
          )}
        </div>

        {/* Password */}
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
              onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
              autoComplete="current-password"
              placeholder="••••••••"
              invalid={!!passwordError}
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
          {passwordError && (
            <p className="text-[11.5px] text-[var(--danger)] mt-1">{passwordError}</p>
          )}
        </div>

        {/* Form-level error (credentials / network) */}
        {formError && (
          <div className="flex gap-2 items-start border border-[#FECACA] bg-[var(--danger-bg)] px-3 py-2.5 text-[12.5px] text-[var(--danger)] rounded-md">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>

        {/* Demo credentials */}
        <div className="pt-5 mt-2 border-t border-[var(--border)]">
          <div className="ui-eyebrow mb-3">Demo credentials · click to fill</div>
          <div className="grid grid-cols-3 gap-2">
            <DemoCred
              role="Admin"
              email="admin@merck.com"
              password="admin123"
              onClick={fillDemo}
              highlight
            />
            <DemoCred
              role="BI Analyst"
              email="analyst@merck.com"
              password="analyst123"
              onClick={fillDemo}
            />
            <DemoCred
              role="Data Scientist"
              email="scientist@merck.com"
              password="scientist123"
              onClick={fillDemo}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

function DemoCred({
  role,
  email,
  password,
  onClick,
  highlight,
}: {
  role: string;
  email: string;
  password: string;
  onClick: (e: string, p: string) => void;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(email, password)}
      className={`text-left p-2.5 rounded-md border transition-colors ${
        highlight
          ? 'border-[var(--brand-100)] bg-[var(--brand-50)] hover:border-[var(--brand)]'
          : 'border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--ink-400)]'
      }`}
    >
      <div
        className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
          highlight ? 'text-[var(--brand-700)]' : 'text-[var(--ink-700)]'
        }`}
      >
        {role}
      </div>
      <div className="text-[11px] text-[var(--ink-700)] font-medium truncate">{email}</div>
      <div className="text-[11px] text-[var(--ink-400)]">{password}</div>
    </button>
  );
}

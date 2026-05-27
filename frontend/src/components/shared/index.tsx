import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from 'react';
import { X } from 'lucide-react';

/* ============================================================
   Card — primary surface used everywhere
   ============================================================ */

export function Card({
  className = '',
  children,
  ...rest
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`ui-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`ui-card-header ${className}`}>
      <div className="min-w-0">
        {eyebrow && <div className="ui-eyebrow mb-1.5">{eyebrow}</div>}
        {title && (
          <div className="text-[15px] font-semibold text-[var(--ink-900)] tracking-tight truncate">
            {title}
          </div>
        )}
        {subtitle && (
          <div className="text-[12px] text-[var(--ink-500)] mt-0.5">{subtitle}</div>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`ui-card-body ${className}`}>{children}</div>;
}

/* ============================================================
   Section title — standalone uppercase eyebrow
   ============================================================ */
export function SectionTitle({
  number,
  children,
  hint,
}: {
  number?: string | number;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between mb-3.5">
      <div className="ui-section-title flex items-baseline gap-2">
        {number && (
          <span className="text-[var(--brand)] font-semibold">{String(number).padStart(2, '0')}</span>
        )}
        <span>{children}</span>
      </div>
      {hint && <span className="text-[11px] text-[var(--ink-400)]">{hint}</span>}
    </div>
  );
}

/* ============ ================================================
   Button
   ============================================================ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'brand-outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--brand)] text-white border border-[var(--brand)] hover:bg-[var(--brand-600)] hover:border-[var(--brand-600)] active:bg-[var(--brand-700)]',
  secondary:
    'bg-white text-[var(--ink-800)] border border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] hover:border-[var(--ink-400)]',
  ghost:
    'bg-transparent text-[var(--ink-700)] border border-transparent hover:bg-[var(--surface-subtle)]',
  subtle:
    'bg-[var(--surface-subtle)] text-[var(--ink-800)] border border-transparent hover:bg-[var(--border)]',
  danger:
    'bg-white text-[var(--danger)] border border-[var(--border-strong)] hover:bg-[var(--danger-bg)] hover:border-[var(--danger)]',
  'brand-outline':
    'bg-white text-[var(--brand)] border border-[var(--brand)] hover:bg-[var(--brand-50)]',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12px] gap-1.5',
  md: 'h-9 px-4 text-[13px] gap-2',
  lg: 'h-11 px-6 text-[14px] gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', leftIcon, rightIcon, className = '', children, ...rest },
    ref,
  ) => (
    <button
      ref={ref}
      className={[
        'inline-flex items-center justify-center font-medium rounded-md transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  ),
);
Button.displayName = 'Button';

/* ============================================================
   Inputs
   ============================================================ */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', invalid, ...rest }, ref) => (
    <input
      ref={ref}
      className={`ui-input ${invalid ? '!border-[var(--danger)]' : ''} ${className}`}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', children, ...rest }, ref) => (
    <select
      ref={ref}
      className={`ui-input pr-8 appearance-none bg-no-repeat bg-[right_10px_center] ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'><path d='M3 4.5l3 3 3-3' stroke='%2371717A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
      }}
      {...rest}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export function Label({
  htmlFor,
  required,
  children,
  className = '',
}: {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`ui-eyebrow block mb-1.5 ${className}`}
    >
      {children}
      {required && <span className="text-[var(--danger)] ml-0.5">*</span>}
    </label>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
  className = '',
}: {
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {error ? (
        <div className="text-[11px] text-[var(--danger)] mt-1">{error}</div>
      ) : hint ? (
        <div className="text-[11px] text-[var(--ink-500)] mt-1">{hint}</div>
      ) : null}
    </div>
  );
}

/* ============================================================
   Badge — tiny status pill
   ============================================================ */
type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand' | 'info';
const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--surface-subtle)] text-[var(--ink-700)] border-[var(--border)]',
  success: 'bg-[var(--success-bg)] text-[var(--success)] border-[#A7F3D0]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[#FDE68A]',
  danger:  'bg-[var(--danger-bg)] text-[var(--danger)] border-[#FECACA]',
  brand:   'bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand-100)]',
  info:    'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
  icon,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-[2px] text-[11px] font-medium rounded-full border ${badgeTones[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

/* ============================================================
   KPI Card — used on Outcome, Model Summary, Data History, Admin
   ============================================================ */
export function KpiCard({
  label,
  value,
  sub,
  trend,
  emphasis,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  trend?: { value: string; positive?: boolean };
  emphasis?: boolean;
}) {
  return (
    <div
      className={`ui-card !rounded-lg !shadow-none px-5 py-4 flex flex-col gap-1.5 ${
        emphasis ? '!border-[var(--brand)] bg-[var(--brand-50)]' : ''
      }`}
    >
      <div className="ui-eyebrow">{label}</div>
      <div className="flex items-baseline gap-2">
        <div
          className={`font-display ${
            emphasis ? 'text-[26px]' : 'text-[28px]'
          } leading-none font-semibold text-[var(--ink-900)]`}
        >
          {value}
        </div>
        {trend && (
          <span
            className={`text-[11px] font-medium ${
              trend.positive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
            }`}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      {sub && <div className="text-[11px] text-[var(--ink-500)]">{sub}</div>}
    </div>
  );
}

/* ============================================================
   Modal — single, consistent overlay
   ============================================================ */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  headerActions,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  headerActions?: ReactNode;
}) {
  if (!open) return null;
  const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-6xl',
  } as const;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1818194D] backdrop-blur-[2px] ui-fade-in">
      <div
        className={`bg-white rounded-xl shadow-[0_24px_48px_rgba(16,24,40,0.18)] w-full ${sizeMap[size]} max-h-[92vh] flex flex-col overflow-hidden`}
      >
        {(title || subtitle) && (
          <div className="px-6 py-5 border-b border-[var(--border)] flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title && (
                <div className="text-[16px] font-semibold text-[var(--ink-900)] tracking-tight">
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="text-[12px] text-[var(--ink-500)] mt-0.5">{subtitle}</div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {headerActions}
              <button
                onClick={onClose}
                className="text-[var(--ink-400)] hover:text-[var(--ink-700)] -m-1 p-1 rounded-md hover:bg-[var(--surface-subtle)]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-2 bg-[var(--surface-muted)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   PageContainer & PageHeader — consistent screen scaffold
   ============================================================ */
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-[1440px] mx-auto px-8 py-8">{children}</div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-7">
      <div className="min-w-0">
        {eyebrow && <div className="ui-eyebrow text-[var(--brand)] mb-2">{eyebrow}</div>}
        <h1 className="font-display text-[36px] leading-[1.1] text-[var(--ink-900)] font-medium tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[14px] text-[var(--ink-500)] mt-2 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

/* ============================================================
   Tab pills — used by ScenarioComparison, Data History, Model Summary
   ============================================================ */
export function TabPills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
}) {
  return (
    <div className="inline-flex p-1 bg-[var(--surface-subtle)] rounded-lg border border-[var(--border)]">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 px-3.5 h-8 text-[12.5px] font-medium rounded-md transition-all ${
            value === o.value
              ? 'bg-white text-[var(--ink-900)] shadow-sm'
              : 'text-[var(--ink-500)] hover:text-[var(--ink-800)]'
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   StatusDot — used in tables / lists
   ============================================================ */
export function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    Success: 'bg-[var(--success)]',
    Pending: 'bg-[var(--warning)]',
    Failed:  'bg-[var(--danger)]',
    Active:  'bg-[var(--success)]',
    Inactive: 'bg-[var(--ink-400)]',
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${map[status] || 'bg-[var(--ink-400)]'}`} />;
}

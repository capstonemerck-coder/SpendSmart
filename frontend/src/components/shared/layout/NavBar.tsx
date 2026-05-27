import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, Shield, User as UserIcon, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { ScreenPermission } from '@/utils/types';
import merckLogo from '@/assets/merck-logo.png';

export type Tab =
  | 'HOME'
  | 'DATA INPUT'
  | 'DATA HISTORY'
  | 'MODEL SUMMARY'
  | 'SCENARIO PLANNING'
  | 'SCENARIO OUTCOME'
  | 'SCENARIO COMPARISONS'
  | 'ADMIN';

interface NavBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const SCREEN_TABS: ScreenPermission[] = [
  'DATA INPUT',
  'DATA HISTORY',
  'MODEL SUMMARY',
  'SCENARIO PLANNING',
  'SCENARIO OUTCOME',
  'SCENARIO COMPARISONS',
];

const tabLabels: Record<Tab, string> = {
  HOME: 'Home',
  'DATA INPUT': 'Input Hub',
  'DATA HISTORY': 'Data History',
  'MODEL SUMMARY': 'Model Insights',
  'SCENARIO PLANNING': 'Scenario Builder',
  'SCENARIO OUTCOME': 'Scenario Projections',
  'SCENARIO COMPARISONS': 'Comparisons',
  ADMIN: 'Admin',
};

export function NavBar({ activeTab, onTabChange }: NavBarProps) {
  const { currentUser, hasPermission, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  if (!currentUser) return null;
  const isAdmin = currentUser.role === 'admin';

  const visibleScreenTabs = SCREEN_TABS.filter((s) => hasPermission(s));
  const visibleTabs: Tab[] = isAdmin ? [] : ['HOME', ...visibleScreenTabs];

  const initials = currentUser.fullName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="bg-white border-b border-[var(--border)] sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-8">
        <div className="flex items-center h-16 gap-8">
          {/* Brand */}
          <button
            onClick={() => onTabChange('HOME')}
            className="flex items-center gap-2.5 group flex-shrink-0"
          >
            <img src={merckLogo} alt="Merck" className="h-8 w-auto" />
            <div className="text-left">
              <div className="font-display text-[16px] font-semibold leading-none text-[var(--ink-900)] tracking-tight">
                SpendSmart
              </div>
              <div className="text-[9px] tracking-[0.2em] uppercase text-[var(--ink-500)] mt-0.5">
                Marketing Mix Optimization
              </div>
            </div>
          </button>

          {/* Primary nav */}
          <nav className="flex items-center gap-1 flex-1 overflow-x-auto -mb-px">
            {visibleTabs.map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className={`relative h-16 px-3 text-[13px] font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    active
                      ? 'text-[var(--brand)]'
                      : 'text-[var(--ink-500)] hover:text-[var(--ink-900)]'
                  }`}
                >
                  {tab === 'ADMIN' && <Shield size={13} />}
                  {tabLabels[tab]}
                  {active && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[var(--brand)] rounded-t-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 px-1.5 h-9 rounded-md hover:bg-[var(--surface-subtle)] transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  isAdmin
                    ? 'bg-[var(--brand)] text-white'
                    : 'bg-[var(--surface-subtle)] text-[var(--ink-700)] border border-[var(--border)]'
                }`}
              >
                {initials}
              </div>
              <ChevronDown size={13} className="text-[var(--ink-500)]" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-[var(--border)] rounded-lg shadow-[0_8px_24px_rgba(16,24,40,0.12)] z-30 overflow-hidden ui-fade-in">
                <div className="px-4 py-3.5 border-b border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold ${
                        isAdmin
                          ? 'bg-[var(--brand)] text-white'
                          : 'bg-[var(--surface-subtle)] text-[var(--ink-700)] border border-[var(--border)]'
                      }`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold text-[var(--ink-900)] truncate">
                        {currentUser.fullName}
                      </div>
                      <div className="text-[11.5px] text-[var(--ink-500)] truncate">
                        {currentUser.email}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-[10px] tracking-widest uppercase text-[var(--brand-700)] bg-[var(--brand-50)] px-2 py-0.5 rounded-full">
                    {isAdmin ? <Shield size={10} /> : <UserIcon size={10} />}
                    {currentUser.role}
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] flex items-center gap-2.5 border-t border-[var(--border)]"
                >
                  <LogOut size={14} className="text-[var(--ink-500)]" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
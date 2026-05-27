import React from 'react';
import {
  BarChart3,
  Database,
  History,
  LineChart as LineChartIcon,
  Layers,
  GitCompare,
  ArrowUpRight,
  Lock,
  Zap,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import type { ScreenPermission } from '@/utils/types';
import { ALL_SCREENS } from '@/utils/types';
import type { Tab } from '@/components/shared/layout/NavBar';

interface UserHomeProps {
  onNavigate: (tab: Tab) => void;
}

const SCREEN_META: Record<
  ScreenPermission,
  {
    icon: React.ReactNode;
    description: string;
    group: 'Data' | 'Insights' | 'Planning';
    bar: string;
  }
> = {
  'DATA INPUT': {
    icon: <Database size={15} />,
    description: 'Upload raw data files or model output.',
    group: 'Data',
    bar: '#007B6E',
  },
  'DATA HISTORY': {
    icon: <History size={15} />,
    description: 'Review past datasets and their lineage.',
    group: 'Data',
    bar: '#009688',
  },
  'MODEL SUMMARY': {
    icon: <LineChartIcon size={15} />,
    description: 'Performance, contributions and channel ROI.',
    group: 'Insights',
    bar: '#00796B',
  },
  'SCENARIO PLANNING': {
    icon: <Layers size={15} />,
    description: 'Spend-based or goal-based scenarios.',
    group: 'Planning',
    bar: '#004D40',
  },
  'SCENARIO OUTCOME': {
    icon: <BarChart3 size={15} />,
    description: 'Visualize outcomes of saved scenarios.',
    group: 'Planning',
    bar: '#00695C',
  },
  'SCENARIO COMPARISONS': {
    icon: <GitCompare size={15} />,
    description: 'Compare up to three scenarios on KPIs.',
    group: 'Planning',
    bar: '#00574B',
  },
};

const GROUP_STYLE: Record<string, React.CSSProperties> = {
  Data:     { background: '#e0f5f1', color: '#00695C' },
  Insights: { background: '#c8ede7', color: '#00574B' },
  Planning: { background: '#b2e4db', color: '#004D40' },
};

export default function UserHome({ onNavigate }: UserHomeProps) {
  const { currentUser, hasPermission } = useAuth();
  if (!currentUser) return null;

  const permitted  = ALL_SCREENS.filter((s) => hasPermission(s));
  const firstName  = currentUser.fullName.split(' ')[0];

  return (
    <div
      style={{
        height: 'calc(100vh - 76px)',
        overflow: 'hidden',
        background: '#f4faf9',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 22px',
        gap: '13px',
        boxSizing: 'border-box',
        fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#007B6E',
          borderRadius: '14px',
          padding: '16px 24px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: 'rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={17} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 600, color: '#fff', lineHeight: 1.1 }}>
              Welcome back, {firstName}
            </div>
            <div
              style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.65)',
                marginTop: '2px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Marketing Mix Modeling Workspace
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '13px',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* MODULE GRID */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
            gap: '18px',
            minHeight: 0,
          }}
        >
          {permitted.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px dashed #b2dfdb',
                borderRadius: '14px',
                background: '#fff',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <Lock size={22} color="#b2dfdb" />
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#888' }}>
                  No screens assigned yet
                </div>
              </div>
            </div>
          ) : (
            permitted.map((s) => {
              const meta = SCREEN_META[s];
              return (
                <button
                  key={s}
                  onClick={() => onNavigate(s as Tab)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    background: '#fff',
                    border: '1px solid #d4ece8',
                    borderRadius: '18px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.boxShadow = '0 5px 20px rgba(0,123,110,0.13)';
                    el.style.transform = 'translateY(-2px)';
                    el.style.borderColor = '#007B6E';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.boxShadow = 'none';
                    el.style.transform = 'translateY(0)';
                    el.style.borderColor = '#d4ece8';
                  }}
                >
                  {/* top accent line */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: meta.bar,
                      borderRadius: '13px 13px 0 0',
                    }}
                  />

                  {/* icon row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                      marginTop: '4px',
                    }}
                  >
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: '#e0f5f1',
                        color: '#007B6E',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {meta.icon}
                    </div>
                    <ArrowUpRight size={13} color="#b2dfdb" />
                  </div>

                  {/* group pill */}
                  <div
                    style={{
                      marginTop: '9px',
                      alignSelf: 'flex-start',
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      ...GROUP_STYLE[meta.group],
                    }}
                  >
                    {meta.group}
                  </div>

                  {/* title */}
                  <div
                    style={{
                      marginTop: '5px',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#1a3a35',
                      lineHeight: 1.2,
                    }}
                  >
                    {getScreenLabel(s)}
                  </div>

                  {/* description */}
                  <div
                    style={{
                      marginTop: '3px',
                      fontSize: '13px',
                      color: '#7a9e99',
                      lineHeight: 1.4,
                    }}
                  >
                    {meta.description}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const screenLabels: Record<ScreenPermission, string> = {
  'DATA INPUT': 'Input Hub',
  'DATA HISTORY': 'Data History',
  'MODEL SUMMARY': 'Model Insights',
  'SCENARIO PLANNING': 'Scenario Builder',
  'SCENARIO OUTCOME': 'Scenario Projections',
  'SCENARIO COMPARISONS': 'Comparisons',
};

function getScreenLabel(s: ScreenPermission): string {
  return screenLabels[s];
}

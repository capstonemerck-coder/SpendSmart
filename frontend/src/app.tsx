// app.tsx — Root application shell
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NavBar } from '@/components/shared/layout/NavBar';
import { FilterBar } from '@/components/shared/layout/FilterBar';
import UnauthorizedScreen from '@/components/shared/layout/UnauthorizedScreen';
import { LoadingState } from '@/components/shared/feedback/LoadingState';
import LandingPage from '@/pages/Landing';
import UserHome from '@/pages/UserHome';
import AdminDashboard from '@/pages/AdminDashboard';
import ScenarioPlanner from '@/pages/ScenarioPlanning';
import ScenarioOutcome from '@/pages/ScenarioOutcome';
import ScenarioComparison from '@/pages/ScenarioComparison';
import ModelSummary from '@/pages/ModelSummary';
import DataHistory from '@/pages/DataHistory';
import DataInput from '@/pages/DataInput';
import type { Tab } from '@/components/shared/layout/NavBar';
import type { Scenario, ScreenPermission } from '@/utils/types';

// ── Seed data ────────────────────────────────────────────────────────────────
const INITIAL_SCENARIOS: Scenario[] = [
  {
    id: 'xx', name: 'xx', type: 'Spend Based', status: 'Success',
    constraints: [
      { channel: 'Events', subChannel: 'speaker programs', roi: 'x.x', currentSpend: '$xxxxx', minSpendPercent: -15, maxSpendPercent: 20 },
    ],
    categoryConstraint: 'CONSUMER', targetSpend: '100000',
  },
  { id: 'yy', name: 'yy', type: 'Goal Based', status: 'Failed', constraints: [], categoryConstraint: 'HCP NPP', targetKPI: 'ROI', targetValue: '150000' },
  { id: 'zz', name: 'zz', type: 'Spend Based', status: 'Pending', constraints: [], categoryConstraint: 'CONSUMER', targetSpend: '120000' },
  { id: 'alpha', name: 'alpha', type: 'Goal Based', status: 'Success', constraints: [], categoryConstraint: 'HCP NPP', targetKPI: 'Incremental Sales', targetValue: '200000' },
  { id: 'beta', name: 'beta', type: 'Spend Based', status: 'Pending', constraints: [], categoryConstraint: 'CONSUMER', targetSpend: '80000' },
];

// ── Root ────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

// ── Shell ───────────────────────────────────────────────────────────────────
function AppShell() {
  const { currentUser, hasPermission, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>(INITIAL_SCENARIOS);
  const [activeOutcomeScenarioId, setActiveOutcomeScenarioId] = useState<string | null>(null);

  // Route to correct home tab after login
  useEffect(() => {
    if (currentUser) {
      setActiveTab(currentUser.role === 'admin' ? 'ADMIN' : 'HOME');
    } else {
      setActiveTab('HOME');
    }
  }, [currentUser]);

  const handleViewOutcome = (scenarioId: string) => {
    setActiveOutcomeScenarioId(scenarioId);
    setActiveTab('SCENARIO OUTCOME');
  };

  // ── Session restore in progress ──────────────────────────────────────────
  if (isLoading) {
    return <LoadingState fullScreen message="Loading SpendSmart…" />;
  }

  // ── Logged-out state: show landing page ──────────────────────────────────
  // Landing manages its own login button and LoginModal.
  if (!currentUser) {
    return <LandingPage />;
  }

  // ── Logged-in state: full shell ──────────────────────────────────────────
  const showFilterBar: Tab[] = [
    'DATA HISTORY',
    'MODEL SUMMARY',
    'SCENARIO PLANNING',
    'SCENARIO OUTCOME',
    'SCENARIO COMPARISONS',
  ];

  const renderScreen = () => {
    if (activeTab === 'HOME') {
      return <UserHome onNavigate={(t) => setActiveTab(t)} />;
    }

    if (activeTab === 'ADMIN') {
      if (currentUser.role !== 'admin') {
        return <UnauthorizedScreen attemptedScreen="Admin" onGoHome={() => setActiveTab('HOME')} />;
      }
      return <AdminDashboard />;
    }

    // Permission guard for screen tabs
    const screen = activeTab as ScreenPermission;
    if (!hasPermission(screen)) {
      return <UnauthorizedScreen attemptedScreen={screen} onGoHome={() => setActiveTab('HOME')} />;
    }

    switch (activeTab) {
      case 'SCENARIO PLANNING':
        return (
          <ScenarioPlanner
            savedScenarios={savedScenarios}
            setSavedScenarios={setSavedScenarios}
            onViewOutcome={handleViewOutcome}
          />
        );
      case 'SCENARIO OUTCOME':
        return (
          <ScenarioOutcome
            savedScenarios={savedScenarios}
            activeScenarioId={activeOutcomeScenarioId}
          />
        );
      case 'SCENARIO COMPARISONS':
        return <ScenarioComparison savedScenarios={savedScenarios} />;
      case 'MODEL SUMMARY':
        return <ModelSummary />;
      case 'DATA INPUT':
        return <DataInput onNavigate={(tab) => setActiveTab(tab as Tab)} />;
      case 'DATA HISTORY':
        return <DataHistory />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-muted)] flex flex-col text-sm">
      <NavBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'SCENARIO OUTCOME') setActiveOutcomeScenarioId(null);
        }}
      />
      {showFilterBar.includes(activeTab) && (
        <FilterBar
          showScenarioFilter={activeTab === 'SCENARIO OUTCOME'}
          scenarioOptions={savedScenarios.map((s) => s.name)}
        />
      )}
      {renderScreen()}
    </div>
  );
}

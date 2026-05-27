# SpendSmart Frontend

Marketing Mix Optimization tool built with React + Vite + Tailwind CSS.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| BI Analyst | `analyst` | `analyst123` |
| Data Scientist | `scientist` | `scientist123` |

## Project Structure

```
src/
├── app.tsx                      # Root shell — routing & layout
├── main.tsx                     # Entry point
├── index.css                    # Design tokens, Tailwind, global styles
├── assets/                      # Static images (Merck logo, etc.)
├── components/
│   ├── shared/                  # Reusable app-level components
│   │   ├── index.tsx            # UI primitives (Button, Card, Modal, …)
│   │   ├── base/                # Low-level inputs (DualRangeSlider, …)
│   │   ├── layout/              # NavBar, FilterBar, UnauthorizedScreen
│   │   └── modals/              # LoginModal, ScenarioInfoModal, …
│   └── ui/                      # shadcn/ui primitives (untouched)
├── context/
│   └── AuthContext.tsx          # Auth state, RBAC, user management
├── hooks/
│   └── useAuth.ts               # Convenience re-export
├── pages/                       # One file per screen
│   ├── Landing.tsx
│   ├── UserHome.tsx
│   ├── AdminDashboard.tsx
│   ├── DataInput.tsx
│   ├── DataHistory.tsx
│   ├── ModelSummary.tsx
│   ├── ScenarioPlanning.tsx
│   ├── ScenarioOutcome.tsx
│   └── ScenarioComparison.tsx
└── utils/
    └── types.ts                 # Shared TypeScript types
```

## Design System

CSS variables live in `src/index.css`. Key tokens:

| Token | Value |
|-------|-------|
| `--brand` | `#00857C` (Merck teal) |
| `--ink-900` | `#18181B` |
| `--surface-muted` | `#FAFAFA` |

Tailwind 4 is configured via `@tailwindcss/vite` — no `tailwind.config.js` needed.

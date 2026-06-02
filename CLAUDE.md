# SpendSmart — CLAUDE.md

Act like a principal engineer building production enterprise software.

This file is the single source of truth for all engineering decisions in this repository.
Read this file completely before writing any code, modifying any file, or making any architectural decision.

---

## Project Overview

**SpendSmart** is an internal Merck platform for pharma Marketing Mix Modeling (MMM).
It allows brand analysts to run scenario optimization, view model insights, and compare
marketing spend allocations across channels and subchannels.

**Tech Stack:**
- Frontend: React + TypeScript (Vite)
- Backend: FastAPI (Python)
- Database: PostgreSQL + SQLAlchemy + Alembic
- Auth: Microsoft Entra ID (MSAL)
- Optimization: Placeholder linear model (SciPy SLSQP deferred)

**User Roles:** Admin, Brand Intelligence Analyst, Data Scientist

---

## Repository Structure

```text
SpendSmart/
├── backend/
│   └── app/
│       ├── api/v1/endpoints/     # auth, cycles, reports, scenarios, uploads, users
│       ├── core/                 # config, dependencies, exceptions, logging, security
│       ├── db/                   # database, seed
│       ├── models/               # SQLAlchemy models
│       ├── schemas/              # Pydantic request/response schemas
│       ├── services/
│       │   ├── upload_service.py
│       │   └── optimizer/
│       │       ├── optimizer_service.py  # entry point — runs placeholder calculation
│       │       ├── calculators/
│       │       │   └── kpi_calculator.py # ACTIVE — KPI = sum(spend_i * roi_i)
│       │       ├── constraints/
│       │       │   └── spend_constraints.py # ACTIVE — validates min/max spend bounds
│       │       ├── objective_functions/  # placeholder — deferred
│       │       ├── scenario_engine/      # placeholder — deferred
│       │       ├── solvers/              # placeholder — deferred (SciPy SLSQP)
│       │       └── transformations/      # placeholder — deferred (adstock, saturation)
│       └── utils/
├── frontend/
│   └── src/
│       ├── assets/
│       ├── components/
│       │   ├── shared/
│       │   │   ├── base/         # DualRangeSlider
│       │   │   ├── charts/       # reusable chart visualizations
│       │   │   ├── data/
│       │   │   ├── feedback/     # EmptyState, ErrorState, LoadingState, SkeletonTable
│       │   │   ├── layout/       # FilterBar, NavBar, UnauthorizedScreen
│       │   │   └── modals/       # DuplicateNameModal, LoginModal, ScenarioInfoModal
│       │   └── ui/               # shadcn primitives
│       ├── context/              # AuthContext
│       ├── hooks/                # useAuth, feature hooks
│       ├── pages/                # AdminDashboard, DataInput, DataHistory, Landing,
│       │                         # ModelSummary, ScenarioComparison, ScenarioOutcome,
│       │                         # ScenarioPlanning, UserHome
│       ├── services/             # api-client, auth, reports, scenarios, upload
│       ├── tests/
│       └── utils/                # types.ts
├── config/
│   ├── cicd/
│   ├── docs/                     # api-reference, handoff, local-setup
│   └── environments/
└── docs/
    └── architecture/             # ARCHITECTURE_RULES.md, CODEBASE_PATTERNS.md
```

---

## Engineering Priorities

1. Correctness
2. Performance & efficiency
3. Readability
4. Maintainability
5. Onboarding simplicity
6. Debugging clarity
7. Handoff friendliness

**Performance and readability are not in conflict.**
Efficient code must still be readable. Readable code must still be efficient.

Optimize where it measurably matters:
- Database queries
- API response times
- Expensive frontend computations
- Optimizer runtime

Do not sacrifice clarity for micro-optimizations where there is no meaningful performance gain.

---

## Local Development Context

This codebase is currently in local development. The following are deferred until staging:
- Cloud infrastructure (Azure App Services, Front Door, Redis, PgBouncer)
- Hardened security checklists
- Strict migration reversibility rules
- Comprehensive test coverage

Focus: build features correctly, consistently, and readably from the start.

---

# Part 1 — Architecture Rules

---

## Backend Flow

```text
API Endpoint
→ Service
→ Model
→ Database
```

- Endpoints remain thin
- Business logic belongs only in services
- Models contain structure only — no logic, no serialization

## Frontend Flow

```text
Page
→ Hook
→ Service
→ API
```

- Pages orchestrate only
- Hooks contain reusable business logic
- Services contain API calls only
- Components focus on rendering only

---

## File Organization

Order inside every file:

1. Imports
2. Constants
3. Types / Interfaces
4. Hooks / Helpers
5. Main component / function
6. Exports

Keep spacing consistent and readable.

---

## Naming Rules

Use descriptive, domain-aware names.

Good:
- `calculateScenarioGrowth`
- `selectedChannelIds`
- `validatedScenarioPayload`
- `scenarioComparisonData`

Bad:
- `data`, `temp`, `obj`, `process`, `handleData`

---

## Forbidden Patterns

Do NOT:
- Call `fetch` / `axios` directly inside components
- Place SQL inside endpoints
- Place business logic inside UI components
- Create giant React pages
- Create giant service files
- Create deeply nested JSX
- Duplicate transformations across files
- Introduce unnecessary abstractions
- Use vague names: `data`, `temp`, `obj`, `handleData`
- Leave undocumented functions or modules

---

## State Management Rules

Prefer:
- Localized state
- Predictable, explicit updates
- State living as close to its consumer as possible

Avoid:
- Hidden shared mutations
- Unnecessary global state
- Tightly coupled components

---

## Validation Rules

Frontend:
- Validate all forms before submission
- Show field-level error messages — not just a generic failure toast

Backend:
- Validate all payloads using Pydantic schemas
- Backend validation is mandatory regardless of frontend validation
- Never trust frontend validation alone

---

## Error Handling Rules

Frontend:
- Show reusable error components — never inline one-off error UI
- Never silently fail
- Every failed API call must surface actionable feedback to the user

Backend:
- Raise centralized exceptions defined in `core/exceptions.py`
- Never expose raw exception messages or stack traces in API responses
- All error responses follow the standard response pattern with `"success": false`

---

## API Rules

Good:
```
GET  /scenarios
POST /scenarios
PUT  /scenarios/{id}
```

Bad:
```
POST /getScenarios
```

All APIs must include `summary` and `description` on every FastAPI route for auto-generated OpenAPI docs.

---

## Database Rules

- Use Alembic for all schema changes
- Use indexes on frequently filtered or joined columns
- Avoid N+1 queries — use `.joinedload()` or `.selectinload()` explicitly
- Use relationships properly
- Avoid duplicated columns
- Paginate large datasets — never return unbounded query results

---

## Performance Rules

Frontend:
- Lazy load heavy screens
- Memoize with `useMemo` / `useCallback` only when there is a measurable render cost — not by default
- Normalize API responses in services before they reach hooks or components

Backend:
- Use `async def` for all I/O-bound routes
- Avoid N+1 queries
- Paginate large datasets
- Use background tasks for work that does not need to block the response
- Keep queries explicit — avoid ORM tricks that obscure intent

---

## UI Rules

Every screen must support:
- Loading state
- Empty state
- Error state
- Responsive behavior

Use reusable components from `components/shared/feedback/`.
Do not duplicate loading or error UI across screens.

---

## Abstraction Rules

Only abstract logic when:
- It is reused in multiple places
- It meaningfully simplifies complexity
- It improves maintainability without obscuring intent

Do NOT abstract prematurely.

---

## Readability Rules

Prefer:
- Explicit naming
- Small, focused functions
- Predictable control flow
- Readable conditionals

Avoid:
- Clever abstractions
- One-line transformations that obscure intent
- Giant `useEffect` blocks
- Deeply nested conditionals

---

## File Size Guidelines

Preferred limits:
- Components: < 250 lines
- Hooks: < 200 lines
- Services: < 250 lines

Split large logic into helpers, hooks, reusable utilities, or focused services.

---

# Part 2 — Codebase Patterns

---

## Response Pattern

All API responses follow:

```json
{
  "success": true,
  "data": {},
  "message": ""
}
```

- Use consistent response structures across all endpoints
- Never return raw ORM models — always serialize through Pydantic response schemas
- Error responses must also follow this structure with `"success": false`

---

## Naming Conventions

**Frontend:**

| Type | Convention | Example |
|---|---|---|
| Components | PascalCase | `ScenarioCard.tsx` |
| Hooks | camelCase prefixed with `use` | `useScenarioFilters.ts` |
| Services | camelCase suffixed with `.service` | `scenarios.service.ts` |
| Variables / Functions | camelCase | `selectedChannelIds` |
| Types / Interfaces | PascalCase | `ScenarioSummary` |
| Constants | UPPER_SNAKE_CASE | `MAX_SCENARIO_COUNT` |

**Backend:**

| Type | Convention | Example |
|---|---|---|
| Functions | snake_case | `calculate_optimized_spend` |
| Classes / Models | PascalCase | `ScenarioModel` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_BUDGET_LIMIT` |
| Private helpers | `_snake_case` | `_validate_channel_params` |
| Pydantic schemas | PascalCase suffixed with `Schema` | `ScenarioCreateSchema` |

---

## Types and Constants

**Frontend — shared types live in:**
```text
frontend/src/utils/types.ts
```
- One domain section per file, clearly commented
- Export all types explicitly — no default exports
- Never inline reused type definitions inside service or hook files

**Frontend — shared constants:**
- Define constants at the top of the file that uses them
- If a constant is reused across files, extract to `frontend/src/utils/`
- Use `UPPER_SNAKE_CASE`

**Backend — shared constants live in:**
```text
backend/app/core/constants.py
```
- Use `UPPER_SNAKE_CASE`
- Never hardcode magic values inside service functions — reference named constants

---

## Frontend Services

Services live in:
```text
frontend/src/services/
```

Existing services:
- `api-client.ts` — base Axios/fetch configuration
- `auth.service.ts`
- `reports.service.ts`
- `scenarios.service.ts`
- `upload.service.ts`

**Module-level comment required on every service file:**

```typescript
/**
 * scenarios.service.ts
 *
 * Handles all API communication for the Scenario Planning module.
 * Covers fetching, creating, updating, and deleting scenarios.
 * All responses are normalized to ScenarioSummary before being returned.
 */
```

**Method-level JSDoc required on every function:**

```typescript
/**
 * Fetches all scenarios for a given brand, sorted by creation date descending.
 *
 * @param {string} brandId - The brand whose scenarios are being fetched.
 * @returns {Promise<ScenarioSummary[]>} Normalized list of scenario summaries.
 * @throws Will throw if the API request fails or returns a non-2xx status.
 */
export const fetchScenariosByBrand = async (brandId: string): Promise<ScenarioSummary[]> => {
```

Rules:
- No inline API calls in components — ever
- Normalize API responses inside services before returning to hooks
- Never expose raw API shapes to the rest of the application

---

## Frontend Hooks

Hooks live in:
```text
frontend/src/hooks/
```

**Module-level comment required on every hook file:**

```typescript
/**
 * useScenarioFilters.ts
 *
 * Manages filter state for the Scenario Planning screen.
 * Exposes selected filters, filter update handlers, and a derived
 * filtered scenario list. Does not handle API communication directly —
 * delegates to scenarios.service.ts.
 */
```

State management inside hooks:
- Keep state as localized as possible
- Prefer explicit state updates over derived mutations
- Avoid hidden side effects inside `useEffect`
- Split large hooks into focused sub-hooks rather than growing one hook indefinitely

---

## Frontend Components

### components/shared/charts/
- Reusable chart visualizations and wrappers
- All charts must be responsive, use reusable wrappers, and support loading and empty states
- Avoid duplicated chart implementations across screens

### components/shared/feedback/
Existing: `EmptyState.tsx`, `ErrorState.tsx`, `LoadingState.tsx`, `SkeletonTable.tsx`
- Always use these — never create one-off inline loading or error UI

### components/shared/layout/
Existing: `FilterBar.tsx`, `NavBar.tsx`, `UnauthorizedScreen.tsx`

### components/shared/modals/
Existing: `DuplicateNameModal.tsx`, `LoginModal.tsx`, `ScenarioInfoModal.tsx`

### components/ui/
shadcn primitives only. Do NOT place business logic, API calls, or transformations here.

**JSDoc required on every component:**

```typescript
/**
 * SpendAllocationChart
 *
 * Renders a stacked bar chart showing spend distribution across
 * channels for a given scenario. Supports loading and empty states.
 *
 * @param {SpendAllocationChartProps} props
 */
```

---

## Backend Services

Services live in:
```text
backend/app/services/
```

Existing services:
- `upload_service.py`
- `optimizer/optimizer_service.py` — entry point, orchestrates placeholder calculation
- `optimizer/calculators/kpi_calculator.py` — **ACTIVE**: `KPI = sum(spend_i * roi_i)`
- `optimizer/constraints/spend_constraints.py` — **ACTIVE**: validates min/max spend bounds
- `optimizer/solvers/scipy_solver.py` — **placeholder**, deferred (SciPy SLSQP)
- `optimizer/objective_functions/objectives.py` — **placeholder**, deferred
- `optimizer/transformations/adstock.py`, `response.py`, `saturation.py` — **placeholder**, deferred

**Module-level docstring required on every service file:**

```python
"""
upload_service.py

Handles all business logic for CSV and Excel model parameter uploads.
Parses, validates, and persists channel and subchannel parameters to the database.
All public functions return validated Pydantic response schemas — never raw ORM objects.
"""
```

**Function-level docstring required on every function:**

```python
def calculate_optimized_spend(channel_params: list[ChannelParam], budget: float) -> OptimizationResult:
    """
    Runs SLSQP optimization across all subchannels for a given total budget.

    Args:
        channel_params: List of subchannel parameter objects including
                        adstock rate, curvature, and curve type.
        budget:         Total budget available for allocation (in USD).

    Returns:
        OptimizationResult containing optimal spend per subchannel
        and the projected KPI value.

    Raises:
        OptimizationFailedError: If SLSQP fails to converge after all
                                 multistart attempts.
    """
```

File organization inside every service file:

1. Imports
2. Constants
3. Private helpers (prefixed with `_`)
4. Public service functions

---

## Documentation Rules

Documentation is mandatory. The codebase must be self-explanatory without verbal handoff.

**Backend — Python Docstrings**
- Every function, method, and class must have a docstring
- Explain *what* it does and *why* it exists
- Document all parameters, return types, and exceptions
- Call out non-obvious behavior, edge cases, and known constraints
- Every module must have a module-level docstring explaining what it owns

**Frontend — JSDoc Comments**
- Every function, hook, and service method must have a JSDoc comment
- Every hook must have a module-level comment explaining what state and behavior it manages
- Every service file must have a module-level comment explaining which API domain it owns

**Inline Comments**

Use for:
- Non-obvious logic decisions
- Constraint explanations
- Known workarounds or limitations

Avoid:
- Comments that restate what the code already says
- Commented-out code left in files

---

## Testing

Tests are deferred for local development. Before moving to staging, every feature requires:

- Happy path tests
- Validation tests
- Error handling tests

Backend: `pytest` — tests live in `backend/tests/`
Frontend: component tests and hook tests — tests live in `frontend/src/tests/`

---

# Part 3 — Feature Implementation Workflow

When implementing any feature:

1. Read this file completely before starting
2. Inspect existing nearby implementations in the same module
3. List all files that will be created or modified before writing any code
4. Implement backend completely — endpoint → service → schema → model
5. Implement frontend completely — page → hook → service → component
6. Add validation — frontend form validation + backend Pydantic validation
7. Add loading, error, and empty states using existing feedback components
8. Add documentation — docstrings and JSDoc for all new functions
9. State any local setup steps required — env vars, DB migrations, seed data

Never stop at scaffolding. Always complete features end-to-end.

New features must feel native to the existing repository.
A reviewer should not be able to tell which engineer wrote which feature.

---

## Final Enforcement Rule

If another engineer cannot immediately understand the implementation flow,
the implementation is incorrect even if it works.

Prioritize:
1. Correctness
2. Performance & efficiency
3. Readability
4. Maintainability
5. Onboarding simplicity
6. Predictable architecture
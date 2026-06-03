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

## UI Design System

All UI must use the CSS custom properties defined below. Never hardcode raw color values (hex, rgb) or arbitrary Tailwind colors (e.g. `text-blue-600`) for anything covered by this system. Always use the variable.

### Color Tokens

**Ink (text):**
- `text-[var(--ink-900)]` — primary text, headings, labels
- `text-[var(--ink-700)]` — secondary text, table cell content
- `text-[var(--ink-600)]` — body descriptions
- `text-[var(--ink-500)]` — muted/supporting text, placeholders
- `text-[var(--ink-400)]` — disabled text, icons at rest

**Brand:**
- `text-[var(--brand)]` — primary brand color (links, active icons, highlights)
- `text-[var(--brand-700)]` — darker brand for text on light brand backgrounds
- `bg-[var(--brand-50)]` — lightest brand tint (hover backgrounds, selected states)
- `border-[var(--brand)]` — brand-colored borders (active/selected states)
- `border-[var(--brand-100)]` — subtle brand border
- `border-[var(--brand-200)]` — medium brand border

**Surfaces:**
- `bg-[var(--surface-muted)]` — table row alternates, section backgrounds, empty zone fills
- `bg-[var(--surface-subtle)]` — card footers, secondary panels, disabled inputs
- `bg-white` — primary content surface

**Borders:**
- `border-[var(--border)]` — default divider and card border
- `border-[var(--border-strong)]` — emphasized borders (dropzone outlines, inactive radio)

**Semantic:**
- `text-[var(--danger)]` — field-level validation errors

### Semantic Color Usage (Non-Token)

Use Tailwind semantic palette only for status indicators. Do not use these for structural UI.

| Semantic state | Background | Border | Text |
|---|---|---|---|
| Success | `bg-green-50` / `from-green-50 to-emerald-50` | `border-green-200` | `text-green-700` / `text-green-900` |
| Warning | `bg-amber-50` | `border-amber-200` | `text-amber-700` |
| Error | `bg-red-50` | `border-red-200` | `text-red-700` / `text-red-900` |
| Info | `bg-blue-50` | `border-blue-100` | `text-blue-700` |

Icon containers for semantic states:
- Success: `bg-green-500` with `text-white` icon, or `bg-green-100` with `text-green-600`
- Error: `bg-red-100` with `text-red-600`
- Warning: `bg-amber-100` with `text-amber-600`

### Typography Scale

| Use | Class |
|---|---|
| Page/section heading | `font-display text-[17px] font-semibold` |
| Card section heading | `text-[16px] font-semibold` |
| Body / primary label | `text-[15px] font-semibold` (labels), `text-[14px] font-semibold` (item names) |
| Supporting body | `text-[13px]` |
| Small / metadata | `text-[12.5px]` |
| Caption / eyebrow | `text-[12px]` or `ui-eyebrow` utility class |
| Micro | `text-[11.5px]` — table annotations, badge text |
| Tag / badge | `text-[10px]` or `text-[9px]` for compact status labels |

Use `font-mono` for identifiers, cycle IDs, and column names. Use `tabular-nums` for numeric columns in tables.

### Spacing & Layout

- Card internal sections: `px-6 py-5`
- Card footer: `px-6 py-4`
- Modal header: `px-6 py-5` (large modal) or `px-6 py-4` (compact)
- Modal footer: `px-6 py-4`
- Dense table cells: `px-4 py-2.5` (data) or `px-3 py-2.5` (compact)
- Section separators inside a card: `divide-y divide-[var(--border)]`
- Card border radius: `rounded-[12px]` or `rounded-xl`
- Modal border radius: `rounded-2xl`

### Interactive States

**Dropzone:**
```
border-2 border-dashed rounded-xl p-10 transition-all
```
- Idle: `border-[var(--border-strong)] bg-[var(--surface-muted)]`
- Drag active: `border-[var(--brand)] bg-[var(--brand-50)]`
- Success: `border-green-500 bg-gradient-to-br from-green-50 to-emerald-50`
- Error: `border-red-300 bg-red-50`

**Selectable card / radio option:**
```
border rounded-lg px-4 py-3 transition-all
```
- Selected: `border-[var(--brand)] bg-[var(--brand-50)] shadow-sm`
- Unselected: `border-[var(--border)] hover:border-[var(--ink-400)] bg-white`

**Custom radio dot:**
```
w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center
```
- Selected: `border-[var(--brand)]` with inner `w-2 h-2 rounded-full bg-[var(--brand)]`
- Unselected: `border-[var(--border-strong)]`

**Status / progress pill:**
```
flex items-center gap-2 px-3 py-1.5 rounded-md border text-[12.5px] font-medium transition-all
```
- Done: `text-green-700 bg-green-50 border-green-200`
- Active: `text-[var(--brand-700)] bg-[var(--brand-50)] border-[var(--brand-200)]`
- Pending: `text-[var(--ink-400)] bg-white border-[var(--border)]`

**Inline status badge (text + icon):**
- Success: `text-green-700` + `<CheckCircle size={12} />`
- Failed: `text-red-600` + `<XCircle size={12} />`
- Pending: `text-amber-700` + `<Clock size={12} />`

### Icon Containers

| Size | Shape | Usage |
|---|---|---|
| `w-8 h-8 rounded-lg` | Square with `rounded-lg` | Compact drawer / list item icons |
| `w-10 h-10 rounded-full` | Circle | Mid-weight card icons |
| `w-11 h-11 rounded-xl` | Rounded square | Feature step headers |
| `w-12 h-12 rounded-full` | Circle | Card section empty/success states |
| `w-14 h-14 rounded-full` | Circle | Dropzone primary state icons |

Icon containers with gradient: `bg-gradient-to-br from-[color-500] to-[color-600]` with `shadow-md`.

Default resting icon containers: `bg-white border border-[var(--border)] shadow-sm`.

### Overlays & Modals

- Backdrop: `fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4`
- Backdrop with blur: add `backdrop-blur-sm` or `backdrop-blur-[1px]`
- Modal container: `bg-white rounded-2xl shadow-xl w-full max-w-[Npx] max-h-[80vh] flex flex-col`
- Side drawer: `fixed top-0 right-0 bottom-0 w-[560px] bg-white shadow-2xl z-50 flex flex-col`
- Side drawer animation: `style={{ animation: 'slideInRight 0.3s ease-out' }}` with keyframe defined in component `<style>` block

### Tables

Header row: `bg-[var(--surface-subtle)] sticky top-0` (modal tables) or `bg-[var(--surface-muted)]` (inline tables)

Header cell: `px-4 py-2.5 text-left ui-eyebrow text-[var(--ink-500)] font-semibold whitespace-nowrap`

Data row: `border-b border-[var(--border)] hover:bg-[var(--surface-muted)]`

Alternating rows (compact tables): `idx % 2 === 0 ? 'bg-white' : 'bg-[var(--surface-muted)]'` + `hover:bg-[var(--brand-50)]`

### Tooltip Pattern

Column header tooltips use CSS group-hover:

```tsx
<th className="... relative group">
  <div className="flex items-center gap-1">
    {columnName}
    <Info size={11} className="text-[var(--ink-400)] opacity-0 group-hover:opacity-100 transition-opacity" />
  </div>
  <div className="absolute left-0 top-full mt-1 bg-[var(--ink-900)] text-white text-[10px] px-2.5 py-1.5 rounded-md shadow-xl z-30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap max-w-[200px] leading-relaxed">
    {tooltipText}
  </div>
</th>
```

### Inline Contextual Banners

Use for in-page status messages (not toasts). Always `w-fit`.

```
flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-md border w-fit
```
- Brand/resolved: `text-[var(--brand-700)] bg-[var(--brand-50)] border-[var(--brand-100)]`
- Warning/incomplete: `text-amber-700 bg-amber-50 border-amber-200`
- Info: `text-blue-700 bg-blue-50 border-blue-100`

### Locked / Read-only Input

When an input is locked after being auto-populated:
```
bg-[var(--surface-subtle)] text-[var(--ink-700)] cursor-not-allowed pr-9
```
Pair with a `<CheckCircle2 size={14} className="text-[var(--brand)]" />` icon absolutely positioned at `right-3 top-1/2 -translate-y-1/2` inside a `relative` wrapper. Always show a caption below explaining why it's locked.

### Gradient Completion Panels

For success/completion states inside cards:
```
bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6
```
Checklist items inside: `bg-white/60 px-4 py-2.5 rounded-lg border border-green-200/50`

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
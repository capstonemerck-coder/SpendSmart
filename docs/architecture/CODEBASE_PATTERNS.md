# Codebase Patterns

> Companion file to `Architecture_rules.md`.
> That file covers the *why and what*. This file covers the *how we write code day-to-day*.

---

## API Services

Services live in:

```text
frontend/src/services/
```

Naming:
- `scenarioService.ts`
- `reportService.ts`
- `authService.ts`
- `uploadService.ts`

**Module-level comment required on every service file:**

```typescript
/**
 * scenarioService.ts
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

## Hooks

Hooks live in:

```text
frontend/src/hooks/
```

Naming:
- `useScenarioFilters.ts`
- `useScenarioComparison.ts`
- `useScenarioData.ts`

Hooks contain:
- Orchestration logic
- Business logic
- Reusable state handling

**Module-level comment required on every hook file:**

```typescript
/**
 * useScenarioFilters.ts
 *
 * Manages filter state for the Scenario Planning screen.
 * Exposes selected filters, filter update handlers, and a derived
 * filtered scenario list. Does not handle API communication directly —
 * delegates to scenarioService.
 */
```

State management inside hooks:
- Keep state as localized as possible
- Prefer explicit state updates over derived mutations
- Avoid hidden side effects inside `useEffect`
- Split large hooks into focused sub-hooks rather than growing one hook indefinitely

File organization inside every hook file:

1. Imports
2. Types / Interfaces
3. Constants
4. Hook function
5. Exports

---

## Components

### components/charts/

Contains:
- Reusable chart visualizations
- Chart wrappers
- Chart utilities

All charts must:
- Remain responsive
- Use reusable wrappers
- Support loading states
- Support empty states

Avoid duplicated chart implementations across screens.

**JSDoc required on every chart component:**

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

### components/tables/

Contains:
- Reusable table abstractions
- Pagination
- Filtering UI
- Sorting logic

Tables must support:
- Pagination
- Filtering
- Sorting
- Empty states
- Loading states

Keep table behavior consistent across all screens. Do not re-implement pagination or sorting logic per screen.

---

### components/ui/

Contains reusable presentational primitives only.

Avoid inside UI components:
- Business logic
- API calls
- Data transformations

---

## Backend Services

Services live in:

```text
backend/app/services/
```

Contains:
- Optimization logic
- Reporting workflows
- Upload processing
- Scenario calculations

**Module-level docstring required on every service file:**

```python
"""
scenario_service.py

Handles all business logic for the Scenario Planning module.
Covers scenario creation, update, deletion, and spend calculation workflows.
Database access is performed via SQLAlchemy models. All public functions
return validated Pydantic response schemas — never raw ORM objects.
"""
```

**Function-level docstring required on every function:**

```python
def calculate_optimized_spend(channel_params: list[ChannelParam], budget: float) -> OptimizationResult:
    """
    Runs SLSQP optimization across all subchannels for a given total budget.

    Distributes spend across subchannels by maximizing the aggregate KPI
    using the provided adstock and curve parameters.

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
5. No exports block needed (Python)

Keep services:
- Focused on one domain
- Free of hidden mutations
- Readable without needing to trace through multiple files to understand a single operation

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
| Services | camelCase suffixed with `Service` | `scenarioService.ts` |
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
frontend/src/types/
```

- One file per domain: `scenario.types.ts`, `report.types.ts`
- Export all types explicitly — no default exports from type files
- Never inline type definitions inside service or hook files if the type is reused

**Frontend — shared constants live in:**

```text
frontend/src/constants/
```

- One file per domain: `scenario.constants.ts`
- Use `UPPER_SNAKE_CASE` for all constant names

**Backend — shared constants live in:**

```text
backend/app/core/constants.py
```

- Use `UPPER_SNAKE_CASE`
- Never hardcode magic values inside service functions — reference named constants

---

## Error Handling Pattern

Frontend:
- Show reusable error components — never inline one-off error UI
- Never silently fail
- Every failed API call must surface actionable feedback to the user

Backend:
- Raise centralized exceptions defined in `core/exceptions.py`
- Never expose raw exception messages or stack traces in API responses
- All error responses follow the standard response pattern with `"success": false`

---

## Validation Pattern

Frontend:
- Validate all forms before submission
- Show field-level error messages — not just a generic failure toast

Backend:
- Validate all payloads using Pydantic schemas
- Backend validation is mandatory regardless of frontend validation
- Never trust frontend validation alone

---

## Feature Development Pattern

Before implementing any feature:

1. Inspect nearby features in the same module
2. Reuse existing patterns — services, hooks, components
3. Preserve naming and file organization consistency
4. Minimize unnecessary abstractions
5. Add documentation as you build — not after

New features must feel native to the existing repository. A reviewer should not be able to tell which engineer wrote which feature.

---

## Testing Note

Tests are deferred for local development. Before moving to staging, every feature requires:

- Happy path tests
- Validation tests
- Error handling tests

Backend: `pytest`
Frontend: component tests and hook tests where appropriate.

---

## Companion Files

This file should be read alongside:

- `Architecture_rules.md` — layered architecture, flow rules, enforcement standards
- `spendsmart_engineering_system_prompt.md` — full engineering context and feature workflow
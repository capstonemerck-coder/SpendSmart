# Architecture Rules

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

---

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

## File Organization Rules

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

## Documentation Rules

Documentation is mandatory. Every function must be understandable without verbal explanation.

**Backend — Python Docstrings**

Every function, method, and class must have a docstring.

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

- Every service module must have a module-level docstring explaining what it owns
- Call out non-obvious behavior, edge cases, and known constraints

**Frontend — JSDoc Comments**

Every function, hook, and service method must have a JSDoc comment.

```javascript
/**
 * Fetches all scenarios for a given brand and maps them into
 * the normalized ScenarioSummary shape used by the Scenario Planning page.
 *
 * Scenarios are sorted by creation date descending so the most
 * recent scenario appears first in the list.
 *
 * @param {string} brandId - The brand whose scenarios are being fetched.
 * @returns {Promise<ScenarioSummary[]>} Sorted list of normalized scenario summaries.
 * @throws Will throw if the API request fails or returns a non-2xx status.
 */
```

- Every hook must have a comment explaining what state and behavior it manages
- Every service file must have a module-level comment explaining which API domain it owns

**Inline Comments**

Use for:
- Non-obvious logic decisions
- Constraint explanations (e.g. why a bound or default value was chosen)
- Known workarounds or limitations

Avoid:
- Comments that restate what the code already says
- Commented-out code left in files

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

Backend:
- Validate all payloads using Pydantic
- Backend validation is mandatory regardless of frontend validation

---

## Error Handling Rules

Frontend:
- Show actionable, meaningful feedback on every failure
- Never silently fail

Backend:
- Centralized exception handling via `core/`
- Structured error responses with appropriate HTTP status codes

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

Use reusable feedback components. Do not duplicate loading or error UI across screens.

---

## Abstraction Rules

Only abstract logic when:
- It is reused in multiple places
- It meaningfully simplifies complexity
- It improves maintainability without obscuring intent

Do NOT abstract prematurely.

---

## Feature Implementation Workflow

When implementing any feature:

1. Analyze requirements
2. Inspect existing nearby implementations and follow their conventions
3. List all files that will be created or modified
4. Implement backend completely — endpoint → service → schema → model
5. Implement frontend completely — page → hook → service → component
6. Add validation — frontend form validation + backend Pydantic validation
7. Add loading, error, and empty states
8. Add documentation — docstrings and JSDoc for all new functions
9. Explain any local setup steps needed — env vars, DB migrations, seed data

Never stop at scaffolding. Always complete features end-to-end.

---

## Final Rule

If another engineer cannot immediately understand the implementation flow, the implementation is incorrect even if it works.

Optimize for:

1. Maintainability
2. Readability
3. Onboarding simplicity
4. Scalability
5. Predictable architecture
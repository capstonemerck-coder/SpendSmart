# SpendSmart — Project Handoff Document

**Version:** 1.0.0
**Status:** Backend complete, frontend UI complete, frontend–backend integration pending
**Stack:** React + Vite + Tailwind (frontend) · FastAPI + PostgreSQL + scipy (backend)

---

## What is SpendSmart?

SpendSmart is an internal **Marketing Mix Modeling (MMM) Optimization Platform** built for Merck.

Its purpose is to answer one core business question:

> *"Given our budget and our historical media performance data, how should we allocate spend across channels to maximize sales — or hit a sales target at minimum cost?"*

The platform does **not** build or train MMM models. It ingests model outputs that are generated externally (by data science teams), and uses those outputs as the mathematical foundation for constrained budget optimization.

Think of it as the **planning and decision layer** that sits on top of an existing MMM.

---

## Who uses it?

Four roles exist, each with different levels of access:

| Role | What they do in the app |
|------|------------------------|
| **Admin** | Manages users — creates accounts, assigns roles, activates/deactivates |
| **Data Scientist** | Uploads raw data (DATA_FACT) and model outputs (MODEL_FACT), reviews model accuracy on the Model Insights screen |
| **Brand Intelligence Analyst** | Full access — builds scenarios, runs the optimizer, views outcomes and comparisons |
| **Leadership** | Read-only access to scenario results and comparisons — no data upload, no scenario creation |

Access is enforced at the screen level via a `ROLE_SCREEN_PERMISSIONS` table seeded in the database at startup.

---

## What does it actually do — screen by screen

### Landing Page
Public-facing entry point with a "Sign In" button. No data is visible until authenticated. Merck-branded.

### Home (User Dashboard)
After login, users land here. Shows quick-access cards for each screen the user has permission to access. Locked screens are shown grayed out with a lock icon so users understand the full platform even if they can't access everything.

### Admin Dashboard
Only visible to admins. Full user management table — create users, assign roles, toggle active status. Shows all registered users with their regions and roles.

### Data Input
Where Data Scientists upload files into the system. Two upload flows:

- **DATA_FACT upload** — historical media spend, reach, and business outcome data (CSV or XLSX). This is the source of truth for what was actually spent historically per channel.
- **MODEL_FACT upload** — externally generated MMM model outputs. Each row represents one channel's model coefficients: the response curve type, curvature, adstock rate, adstock horizon, p-value, impactable sales percentage, and base sales. This file is the primary input to the optimizer.

Both uploads go through a validation pipeline: schema check → type coercion → duplicate removal → transactional batch insert. Errors are reported per-row with field-level detail.

### Data History
A paginated, filterable table showing all DATA_FACT rows that have been ingested for a given planning cycle. Supports filtering by channel and category. Used to audit what historical data is in the system.

### Model Insights (Model Summary)
Shows a summary of the MMM model outputs for the active planning cycle. Key metrics displayed:

- Total sales and total spend baseline
- Base sales vs. incremental (media-driven) sales breakdown with percentage split
- Per-channel table showing total spend, impactable sales, and ROI derived from the model coefficients

This screen is read-only — it shows what the model says about historical performance, not optimization results.

### Scenario Planning (Scenario Builder)
The core workflow screen. Users build optimization scenarios here.

**Two scenario types:**

1. **Spend Based** — "I have $X to spend. Allocate it to maximize incremental sales." The user sets a total budget and per-channel constraints (min/max % change from baseline). The optimizer finds the allocation that maximizes total impactable sales subject to those constraints.

2. **Goal Based** — "I need $Y in incremental sales. What's the minimum spend to get there?" The user sets a sales target. The optimizer minimizes total spend while ensuring the sales target is met, again subject to per-channel constraints.

Users can also set a **category constraint** — restricting optimization to either CONSUMER or HCP NPP channels (Merck's two main promotional categories).

Saved scenarios appear in a table showing name, type, and status (Pending / Success / Failed). Users can run the optimizer on any saved scenario.

### Scenario Outcome
Shows the results for a single optimized scenario:

- Summary KPIs: total optimized spend, total projected sales, impactable sales, portfolio ROI, portfolio mROI
- Per-channel breakdown table: optimized spend allocation, projected impactable sales, channel ROI, channel mROI
- Visual charts showing spend distribution and sales contribution by channel

### Scenario Comparisons
Side-by-side comparison of multiple saved scenarios. Allows users to compare total spend, total sales, ROI, and mROI across scenarios they've built. Used for stakeholder presentations and budget decision-making.

---

## How the optimizer works

This is the mathematical core of the platform. When a user clicks "Run" on a scenario, this is what happens:

### 1. Load channel parameters from MODEL_FACT
Each channel uploaded in MODEL_FACT provides its MMM coefficients: `estimate`, `curve_type`, `curvature`, `adstock_rate`, `adstock_horizon`, `impactable_sales_pct`, `base_sales`.

### 2. Adstock transformation
Media spend doesn't only affect sales in the period it runs — it has carryover effects in future periods. The adstock transformation models this:

```
effective_spend = spend / (1 - adstock_rate)
```

This is the infinite-horizon geometric sum, appropriate for budget optimization where we're allocating a single snapshot of spend rather than a time series.

### 3. Saturation curve
More spend produces diminishing returns. The model supports four curve types, selected per-channel from the MODEL_FACT upload:

- **Power curve** (most common): `response = spend ^ curvature` — curvature < 1 gives diminishing returns
- **Hill / S-curve**: `response = spend^alpha / (spend^alpha + gamma^alpha)`
- **Negative exponential**: `response = 1 - e^(-alpha * spend)`
- **Log**: `response = alpha * log(1 + spend)`

### 4. Channel response function
Combines the above into a single impactable sales estimate:

```
impactable_sales = estimate × saturation(adstock(spend)) × base_sales × (impactable_sales_pct / 100)
```

### 5. scipy SLSQP solver
The optimizer uses Sequential Least Squares Quadratic Programming (SLSQP) from `scipy.optimize.minimize`.

**Spend Based objective:** maximize total impactable sales = minimize negative total sales, subject to sum(spend) = target_spend and per-channel bounds.

**Goal Based objective:** minimize total spend, subject to total impactable sales ≥ target_sales and per-channel bounds.

Per-channel bounds are derived from the user's min/max percentage constraints:
```
lower_bound = current_spend × (1 + min_pct / 100)
upper_bound = current_spend × (1 + max_pct / 100)
```

### 6. KPI calculation
After the solver returns an optimized spend vector:

- **ROI per channel** = impactable_sales / optimized_spend
- **mROI per channel** = (response(spend + $1K) − response(spend)) / $1K — the marginal return on the next dollar
- **Portfolio ROI** = total impactable sales / total spend
- **Portfolio mROI** = spend-weighted average of channel mROIs

Results are stored in `SCENARIO_CHANNEL_RESULTS` (per-channel) and `SCENARIO_OUTCOME` (scenario-level aggregate).

---

## Database — what's stored where

### Master tables (seeded at startup, not user-editable)
- **META_DATA** — market/brand/indication hierarchy (region, market, currency, therapeutic area, brand)
- **ROLE_SCREEN_PERMISSIONS** — maps each role to the screens it can access

### User-managed tables
- **USERS** — accounts with bcrypt-hashed passwords and role assignments
- **CYCLE_DEF** — planning cycles (e.g. "C2026Q1") with date ranges
- **CHANNEL_HIERARCHY** — channel taxonomy tree (category → channel → sub-channel)

### Upload tables (populated by file ingestion)
- **DATA_FACT** — historical media and business data, one row per date × channel × variable
- **MODEL_FACT** — externally generated MMM coefficients, one row per channel
- **UPLOADS** — audit log of every file upload with status and row count

### Backend-generated tables (never user-uploaded)
- **MODEL_CHANNEL_CALCULATIONS** — baseline KPIs derived from MODEL_FACT after upload: total_sales, total_spend, impactable_sales, ROI per channel
- **SCENARIO_HEADER** — one row per scenario with its type, constraints config, and status
- **SCENARIO_CONSTRAINTS** — per-channel min/max spend bounds for each scenario
- **SCENARIO_CHANNEL_RESULTS** — optimizer output per channel: optimized_spend, impactable_sales, ROI, mROI
- **SCENARIO_OUTCOME** — scenario-level aggregate: total_sales, total_spend, impactable_sales, ROI, mROI

---

## Project structure

```
SpendSmart/
│
├── backend/                         Python / FastAPI
│   ├── app/
│   │   ├── main.py                  App entry point, lifespan, CORS, error handlers
│   │   ├── api/v1/endpoints/
│   │   │   ├── auth.py              POST /auth/login, GET /auth/me
│   │   │   ├── users.py             CRUD /users (admin only)
│   │   │   ├── cycles.py            CRUD /cycles
│   │   │   ├── uploads.py           POST /uploads/data-fact, /uploads/model-fact
│   │   │   ├── scenarios.py         CRUD /scenarios + /run + /outcome
│   │   │   └── reports.py           GET /reports/model-summary|data-history|dashboard
│   │   ├── core/
│   │   │   ├── config.py            Pydantic settings — reads from .env
│   │   │   ├── security.py          JWT creation/validation, bcrypt
│   │   │   ├── dependencies.py      FastAPI auth dependencies (get_current_user, require_admin)
│   │   │   ├── exceptions.py        AppError hierarchy (NotFound, Auth, Upload, Optimizer…)
│   │   │   └── logging.py           Structured logging config
│   │   ├── models/models.py         SQLAlchemy ORM — all 12 tables
│   │   ├── schemas/schemas.py       Pydantic v2 request/response models
│   │   ├── services/
│   │   │   ├── upload_service.py    File parsing → validation → batch insert
│   │   │   └── optimizer/
│   │   │       ├── optimizer_service.py      Main orchestrator
│   │   │       ├── transformations/
│   │   │       │   ├── adstock.py            Geometric adstock
│   │   │       │   ├── saturation.py         Power, Hill, exp, log curves
│   │   │       │   └── response.py           channel_response() + mROI
│   │   │       ├── objective_functions/
│   │   │       │   └── objectives.py         scipy objective functions
│   │   │       ├── constraints/
│   │   │       │   └── spend_constraints.py  scipy constraint + bounds builders
│   │   │       ├── solvers/
│   │   │       │   └── scipy_solver.py       solve_spend_based(), solve_goal_based()
│   │   │       └── calculators/
│   │   │           └── kpi_calculator.py     ROI, mROI, scenario outcome aggregation
│   │   └── db/
│   │       ├── database.py          Async SQLAlchemy engine + session factory
│   │       └── seed.py              Seeds ROLE_SCREEN_PERMISSIONS + demo users
│   ├── tests/
│   │   ├── optimizer/test_optimizer.py    23 unit tests — math is verified
│   │   └── services/test_upload_service.py  8 unit tests — parsing + validation
│   ├── check_db.py                  Run before first start to verify DB connection
│   ├── requirements.txt
│   └── .env                         DB URL, JWT secret, CORS origins
│
├── frontend/                        React / Vite / Tailwind v4
│   ├── src/
│   │   ├── app.tsx                  Root shell — routing + layout
│   │   ├── pages/                   One file per screen (9 screens)
│   │   ├── components/
│   │   │   ├── shared/              App-level components (NavBar, FilterBar, modals)
│   │   │   └── ui/                  shadcn/ui primitives
│   │   ├── context/AuthContext.tsx  Auth state — currently mock, ready for real API
│   │   ├── services/                API client layer (built, not yet wired to pages)
│   │   │   ├── api-client.ts        Fetch wrapper with JWT injection
│   │   │   ├── auth.service.ts      Login, logout, token storage
│   │   │   ├── scenarios.service.ts Scenario CRUD + run + outcome
│   │   │   ├── upload.service.ts    DATA_FACT + MODEL_FACT upload
│   │   │   └── reports.service.ts   Model summary + data history + dashboard
│   │   └── utils/types.ts           Shared TypeScript types
│   └── .env                         VITE_API_BASE_URL=http://localhost:8000/api/v1
│
└── config/
    ├── environments/                dev.env, production.env
    ├── cicd/
    │   ├── docker-compose.yml       Full local stack (postgres + backend + frontend)
    │   └── azure-pipelines.yml      5-stage CI/CD: test → build → Docker push → staging → prod
    └── docs/
        ├── local-setup.md           OS-specific PostgreSQL + startup guide
        ├── api-reference.md         All endpoints with request/response examples
        └── handoff.md               This file
```

---

## Data Input Module — Session 2026-06-02

### What was built

Complete end-to-end Data Input module. Allows Admins and Data Scientists to manage
planning cycles and upload channel/subchannel MMM parameter files via a two-step
parse → commit flow. Brand Intelligence Analysts and other roles see a read-only view.

### Files created

| File | Description |
|------|-------------|
| `backend/alembic/versions/0002_data_input_models.py` | Migration: extends cycle_def, adds upload_type to uploads, creates channel_parameter and subchannel_parameter tables |
| `backend/app/services/cycle_service.py` | All CRUD business logic for planning cycles |
| `frontend/src/hooks/useUploadCycles.ts` | Fetches and manages cycle list state |
| `frontend/src/hooks/useUploadActions.ts` | Manages the parse → commit two-step upload flow |
| `frontend/src/hooks/useUploadHistory.ts` | Paginated, filterable upload history state |
| `frontend/src/hooks/useCycleCreate.ts` | Cycle creation state and handler |
| `frontend/src/components/shared/data/UploadPreviewTable.tsx` | Expandable channel/subchannel preview table |
| `frontend/src/components/shared/data/UploadStatusBadge.tsx` | Color-coded status badge for upload records |
| `frontend/src/components/shared/modals/CycleCreateModal.tsx` | Modal for creating a new planning cycle |

### Files modified

| File | Change |
|------|--------|
| `backend/app/models/models.py` | CycleDef: added description, is_active, created_by, updated_at; Upload: added upload_type; new ChannelParameter and SubchannelParameter models |
| `backend/app/schemas/schemas.py` | Extended CycleCreate/CycleOut; added CycleUpdate, SubchannelParamOut, ChannelParamOut, UploadPreviewOut, UploadCommitIn, PaginatedUploads |
| `backend/app/services/upload_service.py` | Added: parse_channel_params_file, commit_channel_params_upload, get_upload_history, delete_upload_record |
| `backend/app/api/v1/endpoints/cycles.py` | Added PUT update and DELETE endpoints; POST now sets created_by from current_user; moved SQL to cycle_service |
| `backend/app/api/v1/endpoints/uploads.py` | Added POST /parse, POST /commit; GET / now returns PaginatedUploads; added DELETE /:id |
| `frontend/src/utils/types.ts` | Added CycleSummary, CycleCreatePayload, UploadStatus, ChannelParam, SubchannelParam, UploadPreview, UploadRecordSummary, UploadHistoryParams, PaginatedUploadHistory |
| `frontend/src/services/upload.service.ts` | Full rewrite: added fetchAllCycles, createCycle, parseUploadFile, commitUpload, fetchUploadHistory, deleteUploadRecord; preserved legacy uploadDataFact/uploadModelFact |
| `frontend/src/pages/DataInput.tsx` | Complete rewrite: API-connected cycle selector, file upload, parse/commit flow, role-based access |
| `frontend/src/pages/DataHistory.tsx` | Complete rewrite: API-connected paginated history with cycle/status filters and admin delete |

### Architectural decisions

**Why cycle_id is still a string PK:** The existing CycleDef uses cycle_id (e.g., "Q3-2025") as a string PK
wired across all other tables (data_fact, model_fact, scenario_header). Changing it to an integer would
require cascading FK changes across 6+ tables. The existing design is preserved; the frontend treats cycle_id
as both the identifier and display name.

**Why parse creates DB records immediately:** The parse endpoint creates the ChannelParameter/SubchannelParameter
rows with status="pending" during parse. During commit, the Upload status is simply flipped to "success".
This avoids server-side caching between parse and commit. Downstream modules filter for Upload.status="success".
Abandoned pending records (user parsed but never committed) are benign for local dev.

**Why cycle delete is blocked at the service layer:** Deleting a cycle that has uploads would orphan Upload records
and all downstream data (ChannelParameter, ScenarioHeader). The block is in cycle_service.delete_cycle() rather
than via a DB-level ON DELETE RESTRICT so the error message is human-readable and specific.

**UploadPreviewTable uses client-side expand state:** All channel rows start expanded, and expand state is local
to the component (not in the hook). This is appropriate since the preview table is ephemeral — it's shown once
between parse and commit, then disappears.

### Known issues

- **CycleDef.updated_at trigger:** PostgreSQL's `onupdate=func.now()` requires the ORM to issue the UPDATE via
  SQLAlchemy. If rows are updated with raw SQL, `updated_at` won't auto-update. This is only relevant for future
  migrations that bulk-update cycle rows.
- **Abandoned pending uploads:** If a user parses a file but never commits, a pending Upload record and its
  ChannelParameter rows remain in the DB. For local dev this is fine; before staging, add a scheduled cleanup job.
- **UploadStatusBadge "Processing":** The 'processing' status is included for completeness but is never set by
  the current parse/commit flow (which goes directly from pending → success). It would be used by a future
  async processing queue.
- **DataHistory shows all upload types:** The history page shows DATA_FACT, MODEL_FACT, and channel_params uploads.
  Future work: add an `upload_type` filter to the filter bar so users can narrow to specific types.

### What the next module (Model Summary) will need from this module

- **Channel parameters:** Model Summary reads from `channel_parameter` and `subchannel_parameter` tables where
  `Upload.status = 'success'` and `Upload.cycle_id = {selected_cycle}`. Use `selectinload` to avoid N+1.
- **Active cycle selection:** DataInput and Model Summary both need a cycle selector. The existing `GET /cycles`
  endpoint is shared. Consider a context-level "active cycle" if multiple screens need the same selection.
- **ROI and spend bounds from ChannelParameter:** The Model Summary's per-channel ROI values come from
  `ChannelParameter.roi_coefficient`. This replaces the `ModelChannelCalculation.roi` used by the old optimizer
  flow for the simplified parameter model.

---

## Auth Module — Session 2026-05-29

### What was built

The complete Auth module was implemented end-to-end, connecting the frontend to the real backend API.

### Files created

| File | Description |
|------|-------------|
| `backend/alembic/env.py` | Async-compatible Alembic environment config |
| `backend/alembic/script.py.mako` | Standard Alembic migration template |
| `backend/alembic/versions/0001_user_auth_fields.py` | Migration: adds `updated_at`, email unique constraint + index |
| `frontend/src/hooks/useAdminUsers.ts` | New hook: admin user CRUD via API |
| `frontend/src/components/shared/feedback/LoadingState.tsx` | Spinner component (was empty) |
| `frontend/src/components/shared/feedback/ErrorState.tsx` | Error display component (was empty) |
| `frontend/src/components/shared/feedback/EmptyState.tsx` | Empty data component (was empty) |
| `frontend/src/components/shared/feedback/SkeletonTable.tsx` | Table skeleton (was empty) |

### Files modified

| File | Change |
|------|--------|
| `backend/app/models/models.py` | User: added `updated_at`, made `email` unique + indexed |
| `backend/app/schemas/schemas.py` | `LoginRequest.username` → `email`; `UserOut` gains `permissions` |
| `backend/app/api/v1/endpoints/auth.py` | Login by email, 401 vs 403 separation, `/me` returns permissions |
| `backend/app/db/seed.py` | Seed users get email addresses (admin@merck.com, etc.) |
| `backend/app/main.py` | Fixed missing `engine` import in lifespan (NameError bug) |
| `frontend/src/utils/types.ts` | `User` interface updated to match API field names (snake_case) |
| `frontend/src/services/auth.service.ts` | Email-based login, full JSDoc, session restore caches profile |
| `frontend/src/context/AuthContext.tsx` | Full rewrite: real API, async login, JWT restore on mount |
| `frontend/src/hooks/useAuth.ts` | Module JSDoc + `isAdmin`, `isAnalyst`, `isAuthenticated` |
| `frontend/src/components/shared/modals/LoginModal.tsx` | Email field, async, field-level validation, demo email creds |
| `frontend/src/pages/Landing.tsx` | Removed dead `currentUser` branch, simplified |
| `frontend/src/pages/AdminDashboard.tsx` | Uses `useAdminUsers` hook, updated to API field names |
| `frontend/src/components/shared/layout/NavBar.tsx` | `fullName` → `full_name` |
| `frontend/src/pages/UserHome.tsx` | `fullName` → `full_name` |
| `frontend/src/app.tsx` | Added `isLoading` gate, removed redundant LoginModal |

### Decisions made

**Email-based login (not username):** The task requires email + password auth. The backend `LoginRequest` now uses `EmailStr`. Seed users have emails assigned (admin@merck.com, analyst@merck.com, scientist@merck.com). The `username` field still exists on users for display purposes.

**Separate 401 vs 403:** Invalid credentials raise `AuthenticationError` (401). Deactivated accounts raise `AuthorizationError` (403). The order in auth.py is intentional: password is checked before active status to avoid user enumeration (an attacker can't tell whether the account exists).

**`/me` returns permissions:** GET /auth/me now queries `ROLE_SCREEN_PERMISSIONS` and returns the full `UserOut` including `permissions: List[str]`. This means the frontend always has an up-to-date permission list after session restore — no need to store permissions separately from the JWT.

**User type renamed fields:** `User.id` → `user_id`, `fullName` → `full_name`, `active` → `is_active`, `createdAt` → `created_at`, `password` removed. These match the backend `UserOut` schema exactly so no normalization layer is needed.

**Admin user management moved to `useAdminUsers` hook:** AuthContext no longer holds the users list or admin CRUD methods. These are now in `hooks/useAdminUsers.ts`, which loads users from the API on mount. AdminDashboard uses this hook directly.

**Feedback components implemented:** `LoadingState`, `ErrorState`, `EmptyState`, and `SkeletonTable` were all empty files. They've been implemented so auth screens can use them.

**Alembic for dev-with-existing-DB:** The app uses `create_tables()` in dev mode (new setups get the correct schema automatically). The Alembic migration handles existing setups that already have the `users` table from an earlier run.

### Known issues / edge cases

- **Demo login flow requires email input.** The LoginModal now has email fields and demo credential buttons pre-fill with `@merck.com` emails. The old username-based flow is no longer supported.
- **`PermissionsModal` in AdminDashboard is read-only.** Per-user permission overrides are not stored in the DB — permissions are entirely role-derived. The modal shows current permissions but does not allow editing. To change a user's access, change their role.
- **`authService.me()` on session restore:** If the backend is unreachable at app startup, the stored user session is cleared. This is intentional — a stale token should not grant access when the server is down.
- **Email uniqueness with NULL values:** PostgreSQL's unique index on `users.email` allows multiple NULL emails (NULLs are distinct). Seed users without emails won't conflict.

---

## Current state and what's left

### Done
- Full backend — all APIs, optimizer engine, upload pipeline, auth, RBAC, DB models
- Full frontend UI — all 9 screens, navigation, design system, Merck branding
- **Auth module fully integrated** — email-based login, JWT session, role-based routing
- **Admin Dashboard wired to API** — user list, create, delete all hit real endpoints
- 31 passing unit tests covering the optimizer math and upload validation
- Docker Compose config for when containerization is needed
- Azure Pipelines CI/CD config ready for Azure DevOps

### Not done yet — the integration gap

The frontend currently runs with **mock/in-memory data** for all modules except Auth and Admin.
The service files in `frontend/src/services/` are written and ready, but the page components
(`DataInput.tsx`, `ScenarioPlanning.tsx`, `ScenarioOutcome.tsx`, etc.) still use local React
state instead of calling those services.

**What the integration work involves**, page by page:

| Page | Integration needed |
|------|--------------------|
| `Landing.tsx` + `LoginModal.tsx` | Replace mock auth with `authService.login()` → store JWT |
| `AuthContext.tsx` | On app load, call `authService.me()` to restore session from localStorage |
| `DataInput.tsx` | Wire file upload inputs to `uploadService.uploadDataFact()` and `uploadModelFact()` |
| `DataHistory.tsx` | Replace hardcoded table with `reportsService.dataHistory(cycleId)` + pagination |
| `ModelSummary.tsx` | Replace mock KPIs with `reportsService.modelSummary(cycleId)` |
| `ScenarioPlanning.tsx` | Replace local scenario state with `scenarioService.create()`, `list()`, `run()` |
| `ScenarioOutcome.tsx` | Replace mock charts with `scenarioService.getOutcome(scenarioId)` |
| `ScenarioComparison.tsx` | Replace mock comparison with multiple `scenarioService.getOutcome()` calls |
| `AdminDashboard.tsx` | Wire user table to `api.get('/users')`, create/update/delete actions |
| `UserHome.tsx` | Wire KPI cards to `reportsService.dashboard()` |

This is the next phase of work. The API contract between frontend and backend is fully defined and the service layer is ready — it's purely a matter of connecting the wires.

---

## How to run locally

**Prerequisites:** Python 3.11+, Node.js 18+, PostgreSQL 14+

```bash
# 1. Set up PostgreSQL (once)
psql -U postgres
CREATE USER spendsmart WITH PASSWORD 'spendsmart';
CREATE DATABASE spendsmart OWNER spendsmart;
GRANT ALL PRIVILEGES ON DATABASE spendsmart TO spendsmart;
\q

# 2. Start backend
cd SpendSmart/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python check_db.py          # verify connection before starting
uvicorn app.main:app --reload --port 8000

# 3. Start frontend (new terminal)
cd SpendSmart/frontend
npm install && npm run dev
```

| URL | What's there |
|-----|-------------|
| http://localhost:5173 | App (frontend) |
| http://localhost:8000/docs | Interactive API docs (Swagger UI) |
| http://localhost:8000/health | Health check |

**Demo logins:**

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin — user management |
| analyst | analyst123 | Brand Intelligence Analyst — full access |
| scientist | scientist123 | Data Scientist — data upload + model insights |

---

## Key technical decisions worth knowing

**Why scipy SLSQP?** It's the right solver for this problem — constrained nonlinear optimization with smooth objective functions (the saturation curves are differentiable). It's fast, well-tested, ships with scipy (no extra license), and handles both equality constraints (spend target) and inequality constraints (sales floor) natively.

**Why async SQLAlchemy?** The upload pipeline inserts potentially thousands of rows and the optimizer can take several seconds. Async ensures the server stays responsive during these operations and can handle multiple concurrent users without blocking.

**Why is MODEL_FACT not validated against a schema strictly?** Intentionally flexible — the external teams generating MMM outputs use different tools and column naming is not always perfectly standardized. The upload service validates required columns and types but accepts extra columns and doesn't fail on optional fields being null.

**Why is the frontend not connected yet?** The frontend was built first from Figma-exported code, which came with fully working mock data and local state. Rather than partially wire it during the backend build (which would have broken the working UI), the service layer was written alongside but kept separate. The integration is the next clean phase of work.

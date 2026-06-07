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

---

## Session 2026-06-03 — Data Input Module Redesign

### Changes Made

**Backend:**
- Added `GET /reports/metadata` endpoint returning all MetaData rows for cascading filter derivation
- Added `GET /reports/data-fact-variables/{cycle_id}` endpoint returning distinct variable values from DATA_FACT
- Updated `POST /uploads/data-fact` to accept optional `metadata_id` form field
- Updated `POST /uploads/model-fact` to accept optional `metadata_id` form field
- Modified `UploadService.process_upload()` to accept `metadata_id` and `target_variable` parameters
- Enhanced `_ensure_cycle()` to link `metadata_id` to CycleDef on cycle creation
- Added `_update_cycle_target_variable()` helper to persist target variable selection to CycleDef

**Frontend:**
- Created `FilterContext.tsx` — React Context for cascading Market → Brand → Indication filtering
- Created `DrawerDataset.tsx` — standalone reusable table component with CSV export and pagination
- Created `export.ts` — utility for exporting arrays to CSV format
- Added new types to `types.ts`: `UploadError`, `UploadResponse`, `UploadHistoryRow`, `DataInputProps`, `MetaData`
- Extended `reports.service.ts` with `metadata()` and `dataFactVariables()` methods
- Updated `uploadDataFact()` and `uploadModelFact()` signatures in `upload.service.ts` to include `metadataId` parameter
- **Rewrote `DataInput.tsx`** — replaced two-step parse/commit flow with 4-stage machine:
  1. **raw-data**: Market/Brand/Indication dropdowns, optional Cycle ID (auto-populated and locked after DATA_FACT), DATA_FACT dropzone
  2. **target-variable**: Searchable grid of predefined + custom variable selection
  3. **model-output**: Locked cycle ID, MODEL_FACT dropzone
  4. **complete**: Green gradient success panel with "View Data History" CTA
- Created `DataInputContent.tsx` — implements the 4-stage machine logic (kept DataInput.tsx as FilterProvider wrapper)

### Architectural Decisions

1. **FilterContext scoping**: Filter state is provided at the DataInput page level only. This keeps the context lightweight and prevents scope creep to other modules.

2. **Metadata resolution on selection**: Instead of separate API calls for each filter level, all MetaData is fetched once on FilterProvider mount. The frontend derives cascading options by filtering the flat list. This reduces API chattiness.

3. **metadata_id as optional link**: metadata_id is optional in the backend (backward compatible) but required for upload in the frontend flow. The cycle is linked to metadata on DATA_FACT upload.

4. **target_variable persistence**: target_variable is stored on CycleDef at MODEL_FACT upload time, not as a separate row. This keeps the schema simple and associates the variable with the cycle lifecycle.

5. **Two-file model**: DataInput.tsx is a thin wrapper (FilterProvider injection). DataInputContent.tsx contains the 4-stage logic. This keeps the former under 50 lines and avoids deep nesting.

### Testing Recommendations

Before staging:
- Manual test each stage: filter selection → DATA_FACT upload → variable selection → MODEL_FACT upload → completion
- Verify metadata cascade behavior (Brand list empties when Market changes, etc.)
- Test upload error paths: wrong file format, network failure, validation error
- Verify CSV export from DrawerDataset preserves all columns and handles null values
- Confirm cycle ID is locked and auto-populated after DATA_FACT upload
- Test that non-admin users see read-only banner on raw-data stage

### Known Limitations

- No upload history modal / clock icon in this version (can be added as follow-up)
- No template drawer (can be added as follow-up)
- Progress indicator uses simple step numbers (can be enhanced with animations)
- No field-level form validation messages (only top-level error banner)

### Next Steps

- Wire Model Summary to `reportsService.modelSummary(cycleId)`

---

## Data History Module — Session 2026-06-05

### What was built

Complete end-to-end Data History module. Allows analysts to review KPI totals (sales, spend,
reach), spend and revenue trends as line charts, a channel efficiency breakdown table, and raw
DATA_FACT rows with pagination and export for any uploaded cycle.

### Files created

| File | Description |
|------|-------------|
| `frontend/src/hooks/useDataHistory.ts` | All state and handlers for the Data History screen: cycle selection, KPI/trend fetching, dataset table pagination, CSV export |
| `frontend/src/components/shared/charts/ChannelBreakdown.tsx` | Filterable, paginated channel efficiency table with inline spend/reach bars and Top/Low badges |
| `frontend/src/components/shared/data/ExportButtons.tsx` | Reusable export button — single-button (CSV) or dropdown (PNG + CSV + both) variants |

### Files modified

| File | Change |
|------|--------|
| `backend/app/schemas/schemas.py` | Added `DataHistoryKPIOut`, `SpendTrendPoint`, `RevenueTrendPoint`, `ChannelBreakdownRow`; added `upload_id` field to `DataFactOut` |
| `backend/app/api/v1/endpoints/reports.py` | Added 5 new endpoints: `GET /cycles`, `GET /kpi-summary/{cycle_id}`, `GET /spend-trend/{cycle_id}`, `GET /revenue-trend/{cycle_id}`, `GET /channel-breakdown/{cycle_id}`; moved `CycleDef` import to top-level |
| `frontend/src/utils/types.ts` | Added `DataHistoryKPI`, `SpendTrendPoint`, `RevenueTrendPoint`, `ChannelBreakdownRow`, `DataFactRow`, `DataHistoryParams`, `DataHistoryPage` under `// ── Data History ──` |
| `frontend/src/services/reports.service.ts` | Added `fetchAvailableCycles`, `fetchKPISummary`, `fetchSpendTrend`, `fetchRevenueTrend`, `fetchChannelBreakdown`, `fetchDataHistory`; updated module-level comment and imports |
| `frontend/src/pages/DataHistory.tsx` | Complete rewrite: replaced upload-history table with KPI cards, trend charts (Recharts LineChart), channel breakdown, and lazy-loaded DATA_FACT table |

### Architectural decisions

**Why KPI, trend, and breakdown are fetched in parallel:** All four requests (KPI + 3 trend/breakdown)
are issued together via `Promise.all` when a cycle is selected. This avoids sequential waterfall
latency. If any fails, all sections degrade together (a single error state covers the whole call).

**Why `tableOpen` triggers lazy row fetch:** DATA_FACT tables can be large. Rows are never fetched
unless the user explicitly clicks "View data". The `useEffect` in `useDataHistory` watches `tableOpen`
and `fetchRows` (stable via `useCallback`); when the table opens, the first fetch runs automatically.

**Why `ChannelBreakdown` is a self-contained component with internal filter state:** The three
filter dimensions (category, performance, page) are only relevant within the channel breakdown view.
Hoisting them into `useDataHistory` would add state the hook has no use for when other tabs are active.

**Why `ExportButtons` uses `onBlur` with `setTimeout` instead of a click-outside handler:**
The `onBlur` + 150ms delay pattern closes the dropdown reliably without requiring a global
`document` event listener or a `useEffect` cleanup. The 150ms gap lets click events on menu
items fire before the blur handler closes the menu.

**Why the dataset table pagination shows at most 7 page buttons:** For cycles with many rows,
rendering hundreds of page buttons would overflow the footer. The `Math.min(totalPages, 7)` cap
keeps the footer compact. A full prev/next + jump pattern can be added if pagination depth grows.

**Why `DataFactOut` was extended with `upload_id`:** The dataset table requires `upload_id` to
let analysts trace which upload ingested a given row. The field is `Optional[int]` and `None` for
any rows that predate the `upload_id` foreign key. Backward compatible — no existing callers break.

### Known issues / TODO before staging

- **PNG export is a no-op:** The `ExportButtons` dropdown exposes a PNG option but `onExportPNG`
  is not wired to a chart-to-image library. Implementing requires `html2canvas` or Recharts' own
  export utilities targeting a `<div ref>`. Can be added as a follow-up.
- **Cycle selector shows all cycles, not filtered by metadata:** `fetchAvailableCycles(null)` fetches
  all cycles. If analysts belong to a specific brand context (from FilterContext), `metadata_id` should
  be passed to narrow the list. Add a `metadataId` prop or consume FilterContext if needed.
- **Channel breakdown category mapping is static:** `CHANNEL_CATEGORIES` is a hardcoded map inside
  `ChannelBreakdown.tsx`. If channel names change in the data, the map needs to be updated manually.
  Future work: derive categories from the ChannelHierarchy table via a new API endpoint.
- **Pagination shows first 7 pages only:** For cycles with more than 70 rows, pages 8+ require
  clicking "Previous"/"Next" manually. Add a full prev/next pagination strip if needed.

### What the next module (Model Summary) will need from this module

- **Cycle selector pattern:** Model Summary needs the same `GET /reports/cycles` endpoint to
  populate its cycle selector. The `reportsService.fetchAvailableCycles` method is ready to reuse.
- **FilterContext for metadata context:** If Model Summary should pre-filter to the user's selected
  brand context, it should consume `FilterContext.filters.metadataId` and pass it to
  `fetchAvailableCycles(metadataId)` to narrow cycles to the relevant brand.

---

## Data Input Module — Refactor 2026-06-04

### What was done

Refactored the Data Input module to match `DataInputRoopa.tsx` (the UX reference design)
while enforcing full CLAUDE.md architecture compliance.

### Files created

| File | Description |
|------|-------------|
| `frontend/src/hooks/useDataInputUpload.ts` | Upload state machine hook: all upload state, handlers, derived values. No API calls inside DataInputContent. |
| `frontend/src/components/shared/data/TemplateDrawer.tsx` | Slide-in drawer with DATA_FACT and MODEL_FACT schema previews and formatting guidelines |
| `frontend/src/components/shared/modals/UploadHistoryModal.tsx` | Self-contained upload history modal (fetches its own data via uploadService.fetchUploadHistory) |
| `frontend/src/components/shared/modals/EmptyDatasetModal.tsx` | Warning modal for empty file uploads |
| `frontend/src/components/shared/modals/WrongFormatModal.tsx` | Error modal with column structure comparison |
| `frontend/src/pages/DataInputTargetVariableStep.tsx` | Target variable selection step component (stage 2 of upload flow) |
| `frontend/src/pages/DataInputUploadSection.tsx` | Upload section component: file type cards + 5-state dropzone |

### Files modified

| File | Change |
|------|--------|
| `frontend/src/context/FilterContext.tsx` | Reshaped to expose `{ filters, options, setMarket, setBrand, setIndication }` — matching Roopa's interface. `indications` now returns `{ indication, metadata_id }[]` objects instead of strings. |
| `frontend/src/services/upload.service.ts` | Added `fetchUploadHistory()` (flat list, no params) and `fetchDataFactVariables(cycleId)` to the `uploadService` object. |
| `frontend/src/components/shared/data/DrawerDataset.tsx` | Replaced paginated data-table component with template-preview component matching Roopa's `DrawerDatasetProps`. |
| `frontend/src/pages/DataInputContent.tsx` | Complete rewrite: 1103 lines → 298 lines. Delegates upload logic to `useDataInputUpload`, renders extracted components. No inline types, no direct API calls. |
| `frontend/src/pages/DataInput.tsx` | Updated to accept and pass through `onNavigate` and `onUploadComplete` props. |

### Files deleted

- `DataInputRoopa.tsx` — reference design, no longer needed.

### Architectural decisions

**Why `useDataInputUpload` is a hook, not split further:** The upload state machine has tight internal
dependencies (handleSubmit advances stages, sets cycleIdLocked, triggers dataFactVariables fetch). Splitting
into smaller hooks would require awkward prop passing between them. A single hook returning a flat object
is the cleanest boundary.

**Why `UploadHistoryModal` is self-contained:** The modal fetches its own data on open and handles
refresh internally. This removes history fetch state from DataInputContent, which otherwise has no use
for the history data outside the modal.

**Why `FilterContext` uses a single `isLoading` state for all three dropdowns:** All metadata is loaded
in a single API call on mount. Per-dropdown loading states would never differ. The three `marketsLoading /
brandsLoading / indicationsLoading` booleans are exposed for API compatibility but all resolve to the
same value.

**Why `DrawerDataset` was replaced rather than renamed:** The existing `DrawerDataset.tsx` was scaffolded
but not imported by any page. The template-preview version (collapsible, with tooltips and download) is the
only use case in the codebase. No regressions from the replacement.

### Known issues / TODO before staging

- `showEmptyModal` and `showErrorModal` visibility states in DataInputContent are never set to `true` by
  the current upload flow — they are wired up and ready but the trigger conditions (empty file detected,
  wrong columns) need to be detected and surfaced from `handleSubmit` in `useDataInputUpload`.
- The existing `DrawerDataset.tsx` was a more complex paginated data-table component (with expand-rows).
  If DataHistory needs a reusable paginated table, create `DataTablePaginated.tsx` rather than restoring
  the old DrawerDataset.

---

## Model Summary Module — Session 2026-06-06

### What was built

Complete end-to-end Model Summary (Module 03) module.  Connects the Model Summary screen to real
`ChannelParameter` and `SubchannelParameter` data uploaded during Data Input.  Replaces all
hardcoded KPI values, chart data, and table rows with API-driven data filtered by the active
Market / Brand / Indication from FilterContext.

### Files created

| File | Description |
|------|-------------|
| `backend/app/services/reports_service.py` | `get_model_summary()` — resolves MetaData → CycleDef → successful channel_params Upload → ChannelParameter + SubchannelParameter rows; returns `ModelSummaryDataSchema`; uses `selectinload` to avoid N+1 |
| `frontend/src/hooks/useModelSummary.ts` | Fetches model summary from API on filter change; skips request when any filter is null; returns `{ summaryData, isLoading, error, refetch }` |

### Files modified

| File | Change |
|------|--------|
| `backend/app/schemas/schemas.py` | Added `SubChannelSummarySchema` and `ModelSummaryDataSchema` before the existing `DashboardKPIs` section |
| `backend/app/api/v1/endpoints/reports.py` | Added `GET /reports/model-summary` (filter-param version) before the existing `GET /reports/model-summary/{cycle_id}` path; imports `get_model_summary` inline to avoid circular import |
| `frontend/src/utils/types.ts` | Added `SubChannelSummary` and `ModelSummaryData` interfaces under the Model Summary section |
| `frontend/src/services/reports.service.ts` | Added `fetchModelSummary(market, brand, indication)` — calls new endpoint, manually unwraps `{ success, data, message }` envelope, normalizes snake_case to camelCase |
| `frontend/src/pages/ModelSummary.tsx` | Complete rewrite: all hardcoded data replaced; reads FilterContext; uses `useModelSummary`; loading/error/empty states; 2-level channel/subchannel table; live GroupedBarChart, TopBottomChannels, ScatterChart |

### Architectural decisions

**`current_spend` sourced from DATA_FACT:** For each subchannel, `current_spend` is the sum of
`data_fact.spend` grouped by `(cycle_id, channel, sub_channel)` — actual historical spend from the
DATA_FACT upload for that cycle. When no DATA_FACT rows exist for a subchannel (e.g. a MODEL_FACT was
uploaded before the DATA_FACT, or the channel names don't match), it falls back to
`SubchannelParameter.min_spend`. Both paths are documented in the service module docstring.

**Baseline KPI and derived KPIs:** `baseline_kpi = total_incremental_sales = sum(current_spend ×
roi_coefficient)` across all subchannels. The API also returns `total_spend`, `total_sales`,
`overall_roi`, `total_base_sales`, `total_incremental_sales`, `base_pct`, `incremental_pct` — all
computed server-side in `reports_service.get_model_summary()`, not by importing `kpi_calculator.py`
(which would cross architectural boundaries between the reports and optimizer layers).
`total_base_sales` sums `SubchannelParameter.base_sales` from MODEL_FACT uploads; it is 0.0 for
channel_params-sourced rows that lack this field.

**Filter resolution chain:** `market + brand + indication → MetaData.metadata_id → most recent
CycleDef.cycle_id → most recent Upload (status=success, upload_type=channel_params) → ChannelParameter
+ SubchannelParameter (selectinload)`.  If any step yields no row, the endpoint returns
`{ success: true, data: null, message: "No model data found…" }` — not a 404.

**Response envelope:** New endpoint uses `{ success, data, message }` (consistent with CLAUDE.md
pattern) unlike the older `/model-summary/{cycle_id}` which returns data directly.  The service
method manually unwraps the envelope before returning to the hook.

**Path ordering in reports.py:** The filter-param endpoint `GET /model-summary` is registered
BEFORE the path-param endpoint `GET /model-summary/{cycle_id}` to prevent FastAPI from absorbing
`?market=...` query-string requests into the `{cycle_id}` route.

**3-level → 2-level table:** The original hardcoded table had three tiers (Category > Channel >
Subchannel). The API data has two (Channel > Subchannel).  Channel is now the outer expandable
tier; the Category concept is dropped from the table.  Channel color assignment is dynamic from a
fixed 10-color `CHANNEL_COLORS` palette mapped to channels in order of appearance.

**Chart components accept props:** `GroupedBarChart`, `TopBottomChannels`, and `ScatterChart` are
local sub-components that accept channel/subchannel data as props derived from `summaryData`.  They
do not close over hardcoded constants.  Each supports an empty state (no data rendered → message).

**KpiCard does not accept `className`:** The shared `KpiCard` component has no `className` prop.
The three KPI cards render without grid-span overrides; the mini stacked bar chart uses a raw
`<Card>` for the remaining 3 of 6 columns.

### Data flow

```
FilterContext { market, brand, indication }
  → useModelSummary(market, brand, indication)
    → reportsService.fetchModelSummary(market, brand, indication)
      → GET /api/v1/reports/model-summary?market=&brand=&indication=
        → reports_service.get_model_summary()
          → MetaData → CycleDef → Upload → ChannelParameter + SubchannelParameter
          → DataFact (spend aggregated by channel/subchannel for the cycle)
          → SubchannelParameter.current_spend = DataFact spend or min_spend fallback
    → ModelSummaryData {
        baselineKpi, channels[], cycleId, uploadedAt,
        totalSpend, totalSales, overallRoi,
        totalBaseSales, totalIncrementalSales, basePct, incrementalPct
      }
  → channelGroups (useMemo — grouped + aggregated from channels[])
  → chartChannels, chartSubchannels, chartScatter (useMemo — shaped for each chart)
  → filteredChannels (useMemo — filtered + sorted table rows)
  KPI cards use summaryData.totalSpend and summaryData.overallRoi (server-computed)
```

### Known issues / TODO before staging

- **Chart export is a no-op:** Export buttons (`ExportButton`) call `markExported()` (which updates
  the "Exported" badge) but do not actually serialize any chart to PNG/CSV.  Implementing requires
  `html2canvas` or a chart library's own export utilities. Add as follow-up.
- **TopBottomChannels shows all subchannels when category filter is "all":** The top/bottom 10%
  slices are taken from all subchannels regardless of channel. If users need per-channel ranking,
  filter to a single channel first using the channel dropdown in that panel.
- **Sort requires expand-all:** Column-header sort in the contribution table only takes effect when
  rows are expanded (the `isAnythingExpanded` guard prevents sort clicks on collapsed table). This
  is by design — the sort UX makes no sense when only channel-level summary rows are visible.
- **`--success` and `--danger` CSS variables in table:** The contribution delta arrows (`↑`/`↓`)
  reference `var(--success)` and `var(--danger)`. Confirm these CSS custom properties exist in the
  global stylesheet (they are used elsewhere in the codebase and should be present).
- **ScatterChart y-axis label truncation:** For cycles with many subchannels, dots cluster near
  the x-axis if sales values are close to zero. The current axis scaling leaves 15% headroom above
  `maxSales`; if needed, adjust `* 1.15` factor.

---

## Schema Alignment: MODEL_FACT + DATA_FACT columns — Session 2026-06-07

### What was built

Schema alignment pass to add missing MMM parameter columns to `channel_parameter` and
`subchannel_parameter`, update Pydantic schemas to expose those columns, update the upload
service to persist MODEL_FACT data into the channel parameter tables, and update the Model
Summary service to consume MODEL_FACT-sourced channel parameter rows.

### Files modified

| File | Change |
|------|--------|
| `backend/app/models/models.py` | `ChannelParameter`: added `category`, `variable`. `SubchannelParameter`: added `category`, `variable`, `estimate`, `curve_type`, `curvature`, `adstock_rate`, `adstock_horizon`, `p_value`, `impactable_sales_pct`, `base_sales`. Full docstrings on new columns. |
| `backend/app/schemas/schemas.py` | `SubchannelParamOut`: added all 10 new optional fields. `ChannelParamOut`: added `category`, `variable`. `SubChannelSummarySchema` (Model Summary): added all 10 new optional fields so the Model Summary API response carries full MMM parameter data. |
| `backend/app/services/upload_service.py` | `process_upload`: sets `upload_type` on DATA_FACT ("data_fact") and MODEL_FACT ("model_fact") uploads. Added `_validate_model_fact_content` (estimate not null, impactable_sales_pct 0–100, adstock_rate 0–1). Added `_validate_data_fact_content` (spend ≥ 0). Updated `_ingest_model_fact` signature to accept `cycle_id`; it now calls `_create_channel_params_from_model_fact` after inserting ModelFact rows. Added `_create_channel_params_from_model_fact`: groups MODEL_FACT rows by channel, creates ChannelParameter + SubchannelParameter rows with all MMM fields, so Model Summary can read MODEL_FACT data through the channel parameter schema without requiring a separate channel_params upload. |
| `backend/app/services/reports_service.py` | `get_model_summary`: now searches for `upload_type IN ('channel_params', 'model_fact')` instead of only `'channel_params'`. Subchannel row construction now populates all new MMM fields from `SubchannelParameter` into `SubChannelSummarySchema`. |
| `backend/alembic/versions/e8e559c02611_model_fact_spend_fact_columns.py` | Migration: adds `category`, `variable` to `channel_parameter`; adds all 10 MMM columns to `subchannel_parameter`. Uses `IF NOT EXISTS` because these columns existed in the DB prior to this migration being formalised. |

### Migration revision

`e8e559c02611` — down_revision: `0002`

### SpendFact table — not added

The task brief assumed no DATA_FACT spend table existed. In fact `DataFact` (the `data_fact`
table) was already created in migration 0000 and fully covers the same use case. Adding a
`SpendFact` table would be a direct duplicate. `DataFact` continues to be the canonical store
for DATA_FACT uploads.

### Remaining work

Module 04 — Scenario Planning (ready to implement; all upstream data is now fully stored and accessible).

---

## FilterBar → FilterContext Fix — Session 2026-06-05

### Root cause

Two structural bugs caused the filter dropdowns in the Data History tab to have no effect
on the page's content:

1. **FilterBar was rendered outside `<FilterProvider>`** in `App.tsx`. The `<FilterBar>` JSX
   appeared before `<FilterProvider>` in the render tree, making it structurally impossible
   for FilterBar to call `useFilters()` — doing so would have thrown "useFilters must be used
   within a FilterProvider."

2. **FilterBar used isolated local state with hardcoded option arrays.** Its internal
   `useState<Record<string, string>>` was seeded from a hardcoded `defaultFilters` object
   containing fake options (`['US', 'US Northeast', ...]`, `['Brand A', 'Product Alpha', ...]`).
   User selections never called `setMarket`, `setBrand`, or `setIndication`, so
   `filters.metadataId` stayed `null` permanently on the Data History tab — blocking all
   cycle loading and downstream data.

### Files changed

| File | What changed |
|------|-------------|
| `frontend/src/app.tsx` | Moved `<FilterProvider>` up to wrap both `<FilterBar>` and `{renderScreen()}`. Previously FilterProvider only wrapped renderScreen(). No other App.tsx logic changed. |
| `frontend/src/components/shared/layout/FilterBar.tsx` | Replaced hardcoded `defaultFilters` with `useFilters()` from FilterContext. Market/Brand/Indication options now come from `options.markets`, `options.brands`, `options.indications` (the same API-fetched metadata used by Data Input's inline dropdowns). onChange handlers now call `setMarket`, `setBrand`, `setIndication` directly — no local state for these three fields, no Apply batching. Reset calls `setMarket(null)` which cascades to clear brand, indication, and metadataId via FilterContext. The `filters` prop (old hardcoded FilterOption array) has been removed entirely. |

### Cycle filter status (pending wiring)

The Cycle filter row in FilterBar is kept as **local state** via a `cycleOptions?: string[]` prop.
It is not currently wired to Data History's cycle display (which has its own inline cycle selector).
The `cycleOptions` prop defaults to `[]`, so the Cycle row is hidden unless the caller passes
cycle IDs. To complete the wiring: pass `useDataHistory().availableCycles` from DataHistory's
render tree to FilterBar via the prop. This requires either lifting the prop through App.tsx
(complex) or moving the cycle selector inside FilterBar and giving FilterBar access to
`reportsService.fetchAvailableCycles`. For now, DataHistory's own inline cycle `<Select>` (shown
below the filter bar when `filters.metadataId` is set) is the functional cycle selector.


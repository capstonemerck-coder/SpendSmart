# SpendSmart — Backend

FastAPI-based MMM Optimization Platform backend.

## Quick Start (local, no Docker)

```bash
cd backend

# 1. Create virtualenv
python3 -m venv .venv && source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start PostgreSQL (or use Docker)
docker run -d --name spendsmart-db \
  -e POSTGRES_USER=spendsmart \
  -e POSTGRES_PASSWORD=spendsmart \
  -e POSTGRES_DB=spendsmart \
  -p 5432:5432 postgres:16-alpine

# 4. Copy env file
cp .env.example .env   # edit DATABASE_URL if needed

# 5. Start the server (auto-creates tables + seeds DB on first run)
uvicorn app.main:app --reload --port 8000
```

API Docs: http://localhost:8000/docs

## Quick Start (Docker Compose)

```bash
# From project root
cp config/environments/dev.env .env
docker compose -f config/cicd/docker-compose.yml up --build
```

## Demo Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| analyst | analyst123 | Brand Intelligence Analyst |
| scientist | scientist123 | Data Scientist |

## Architecture

```
app/
├── main.py                    # FastAPI app + lifespan
├── api/v1/endpoints/
│   ├── auth.py                # POST /auth/login, GET /auth/me
│   ├── users.py               # CRUD /users (admin only)
│   ├── cycles.py              # CRUD /cycles
│   ├── uploads.py             # POST /uploads/data-fact|model-fact
│   ├── scenarios.py           # CRUD /scenarios + /run + /outcome
│   └── reports.py             # GET /reports/model-summary|data-history|dashboard
├── core/
│   ├── config.py              # Pydantic settings (reads .env)
│   ├── security.py            # JWT + bcrypt
│   ├── dependencies.py        # FastAPI auth dependencies
│   ├── exceptions.py          # AppError hierarchy
│   └── logging.py             # Structured logging
├── models/models.py           # SQLAlchemy ORM (matches ERD exactly)
├── schemas/schemas.py         # Pydantic v2 request/response models
├── services/
│   ├── upload_service.py      # File parsing, validation, ingestion
│   └── optimizer/
│       ├── optimizer_service.py          # Orchestrator
│       ├── transformations/
│       │   ├── adstock.py               # Geometric adstock
│       │   ├── saturation.py            # Hill, power, exp, log curves
│       │   └── response.py              # channel_response() + mROI
│       ├── objective_functions/
│       │   └── objectives.py            # scipy objective functions
│       ├── constraints/
│       │   └── spend_constraints.py     # scipy constraint builders
│       ├── solvers/
│       │   └── scipy_solver.py          # solve_spend_based(), solve_goal_based()
│       └── calculators/
│           └── kpi_calculator.py        # ROI, mROI, scenario outcome aggregation
└── db/
    ├── database.py            # Async engine + session factory
    └── seed.py                # Master table seeder
```

## Running Tests

```bash
cd backend
pytest tests/ -v --tb=short
```

## API Reference

See [/docs](http://localhost:8000/docs) for interactive Swagger UI.

Key endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/auth/login | Login → JWT |
| GET | /api/v1/auth/me | Current user |
| POST | /api/v1/uploads/data-fact | Upload DATA_FACT CSV/XLSX |
| POST | /api/v1/uploads/model-fact | Upload MODEL_FACT CSV/XLSX |
| GET | /api/v1/cycles | List planning cycles |
| POST | /api/v1/cycles | Create cycle |
| GET | /api/v1/scenarios | List scenarios |
| POST | /api/v1/scenarios | Create scenario |
| POST | /api/v1/scenarios/{id}/run | **Run optimizer** |
| GET | /api/v1/scenarios/{id}/outcome | Fetch results |
| GET | /api/v1/reports/model-summary/{cycle_id} | Model Insights data |
| GET | /api/v1/reports/data-history/{cycle_id} | Data History (paginated) |
| GET | /api/v1/reports/dashboard | Homepage KPIs |

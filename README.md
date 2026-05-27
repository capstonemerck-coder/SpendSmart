# SpendSmart — Marketing Mix Optimization Platform

Enterprise-grade MMM scenario planning and spend allocation platform.

## What this is

SpendSmart **ingests externally-generated MMM outputs** (MODEL_FACT) and uses them
to run constrained nonlinear optimization (scipy SLSQP) to:

- Allocate a fixed budget for maximum impactable sales (**Spend Based**)
- Find the minimum spend to hit a sales target (**Goal Based**)
- Generate per-channel ROI, mROI, and scenario comparison reports

## Project Structure

```
SpendSmart/
├── backend/              FastAPI + PostgreSQL + scipy optimizer
├── frontend/             React + Vite + Tailwind — existing UI
└── config/
    ├── environments/     dev.env, production.env
    ├── cicd/             docker-compose.yml, azure-pipelines.yml
    └── docs/             Architecture, user flows, API reference
```

## Quick Start — Docker Compose

```bash
# Clone / unzip the project
cd SpendSmart

# Start the full stack (PostgreSQL + Backend + Frontend)
docker compose -f config/cicd/docker-compose.yml up --build

# App:      http://localhost:80
# API:      http://localhost:8000
# API docs: http://localhost:8000/docs
```

## Quick Start — Local Development

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Start postgres first (see backend/README.md)
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

## Demo Credentials

| Username   | Password     | Role                      | Access |
|------------|--------------|---------------------------|--------|
| admin      | admin123     | Admin                     | User management |
| analyst    | analyst123   | Brand Intelligence Analyst | All screens |
| scientist  | scientist123 | Data Scientist            | Data Input, History, Model Insights |

## Application Flow

```
1. Login
2. Create a Planning Cycle
3. Upload DATA_FACT (historical media data)
4. Upload MODEL_FACT (externally-generated MMM output)
5. Open Scenario Builder → configure constraints
6. Save scenario → Run optimizer
7. View Scenario Outcome (ROI, mROI, channel breakdown)
8. Compare scenarios side-by-side
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS v4 |
| Backend | FastAPI, Python 3.12, asyncpg |
| Database | PostgreSQL 16, SQLAlchemy 2.0, Alembic |
| Optimizer | scipy.optimize (SLSQP) |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Containers | Docker, Docker Compose |
| CI/CD | Azure Pipelines |

## Key Design Decisions

- **Async-first**: all DB operations use SQLAlchemy async + asyncpg driver
- **No MMM training**: system only ingests pre-computed model outputs
- **Modular optimizer**: transformations, objectives, constraints, solvers are all independent modules
- **RBAC via DB**: `ROLE_SCREEN_PERMISSIONS` table drives screen access (seeded on startup)
- **Transactional uploads**: all file ingestion runs in a single DB transaction with rollback on error

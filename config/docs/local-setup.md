# SpendSmart — Local Setup Guide (No Docker)

---

## STEP 0 — Find your OS section below

- **macOS** → Section A
- **Windows** → Section B
- **Ubuntu/Debian Linux** → Section C

---

## SECTION A — macOS

### A1. Install PostgreSQL

The easiest way on Mac is Postgres.app (no terminal needed):

1. Go to https://postgresapp.com
2. Download and drag to Applications
3. Open it — click "Initialize"
4. You'll see a green elephant in your menu bar — PostgreSQL is running

**OR** via Homebrew if you have it:
```bash
brew install postgresql@16
brew services start postgresql@16
```

### A2. Create the database

Open Terminal:
```bash
# Open postgres shell
psql postgres

# Inside psql, run these 3 lines:
CREATE USER spendsmart WITH PASSWORD 'spendsmart';
CREATE DATABASE spendsmart OWNER spendsmart;
GRANT ALL PRIVILEGES ON DATABASE spendsmart TO spendsmart;

# Exit
\q
```

### A3. Install Python dependencies

```bash
cd SpendSmart/backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install all packages
pip install -r requirements.txt
```

### A4. Configure .env

The `.env` file is already in `SpendSmart/backend/.env` with:
```
DATABASE_URL=postgresql+asyncpg://spendsmart:spendsmart@localhost:5432/spendsmart
```
This matches what we just created — no changes needed.

### A5. Start the backend

```bash
# From SpendSmart/backend, with .venv active:
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO: SpendSmart backend ready.
INFO: Uvicorn running on http://0.0.0.0:8000
```

Open http://localhost:8000/docs — you'll see the full API.

### A6. Start the frontend

Open a NEW terminal tab:
```bash
cd SpendSmart/frontend
npm install
npm run dev
```

Open http://localhost:5173 — the app loads.

---

## SECTION B — Windows

### B1. Install PostgreSQL

1. Go to https://www.postgresql.org/download/windows/
2. Download the installer (PostgreSQL 16)
3. Run it — use these settings:
   - Password for postgres superuser: `postgres` (remember this)
   - Port: `5432` (default — don't change)
   - Locale: default
4. Finish the install — PostgreSQL is now running as a Windows Service

### B2. Create the database

Open **pgAdmin 4** (installed automatically with PostgreSQL):

1. Open pgAdmin → connect to your local server
2. Right-click "Databases" → Create → Database
   - Name: `spendsmart`
3. Right-click "Login/Group Roles" → Create → Login/Group Role
   - Name: `spendsmart`
   - Password: `spendsmart`
   - Privileges tab: check "Can login"
4. Right-click `spendsmart` database → Properties → Security
   - Add `spendsmart` user with ALL privileges

**OR** via Command Prompt (run as Administrator):
```cmd
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres

-- In psql:
CREATE USER spendsmart WITH PASSWORD 'spendsmart';
CREATE DATABASE spendsmart OWNER spendsmart;
GRANT ALL PRIVILEGES ON DATABASE spendsmart TO spendsmart;
\q
```

### B3. Install Python dependencies

Open **PowerShell** (not CMD):
```powershell
cd SpendSmart\backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# If you get an execution policy error, run first:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install packages
pip install -r requirements.txt
```

### B4. Configure .env

The `.env` file is already correct. If psycopg2 complains, also install:
```powershell
pip install psycopg2-binary
```

### B5. Start the backend

```powershell
# Still in SpendSmart\backend with .venv active:
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs

### B6. Start the frontend

Open a NEW PowerShell window:
```powershell
cd SpendSmart\frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## SECTION C — Ubuntu / Debian Linux

### C1. Install PostgreSQL

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### C2. Create the database

```bash
# Switch to postgres system user
sudo -u postgres psql

# Inside psql:
CREATE USER spendsmart WITH PASSWORD 'spendsmart';
CREATE DATABASE spendsmart OWNER spendsmart;
GRANT ALL PRIVILEGES ON DATABASE spendsmart TO spendsmart;
\q
```

### C3. Install Python dependencies

```bash
cd SpendSmart/backend

# Install build tools if needed
sudo apt install -y python3-venv python3-pip libpq-dev gcc

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install packages
pip install -r requirements.txt
```

### C4. Configure .env

Already correct — no changes needed.

### C5. Start the backend

```bash
uvicorn app.main:app --reload --port 8000
```

### C6. Start the frontend

```bash
# New terminal
cd SpendSmart/frontend
npm install
npm run dev
```

---

## VERIFY IT'S WORKING

After starting both servers, open these URLs:

| URL | What you should see |
|-----|-------------------|
| http://localhost:8000/health | `{"status":"ok"}` |
| http://localhost:8000/docs | Interactive API docs |
| http://localhost:5173 | SpendSmart login page |

### Test login via API docs:
1. Go to http://localhost:8000/docs
2. Click `POST /api/v1/auth/login` → Try it out
3. Enter: `{"username": "admin", "password": "admin123"}`
4. Execute — you should get a JWT token back

### What happens on first startup:
The backend auto-creates all database tables and seeds:
- 3 demo users (admin, analyst, scientist)
- Role-screen permissions
- Sample metadata

---

## TROUBLESHOOTING

### "connection refused" on port 5432
PostgreSQL isn't running.
- Mac: Open Postgres.app or run `brew services start postgresql@16`
- Windows: Open Services → find "postgresql-x64-16" → Start
- Linux: `sudo systemctl start postgresql`

### "password authentication failed"
The user wasn't created correctly. Re-run the CREATE USER command.

### "ModuleNotFoundError"
Your virtual environment isn't active. Run:
- Mac/Linux: `source .venv/bin/activate`
- Windows: `.venv\Scripts\Activate.ps1`

### "npm not found"
Install Node.js from https://nodejs.org (LTS version)

### asyncpg install fails on Windows
Try: `pip install asyncpg --no-binary asyncpg`
Or use the pre-built wheel: `pip install asyncpg==0.30.0`

---

## ONCE IT RUNS — Wire frontend to backend

Right now the frontend uses local mock data.
To connect it to the real backend, see: `config/docs/frontend-integration.md`
(we'll build this in the next step)

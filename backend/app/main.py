"""
SpendSmart Backend — FastAPI application entry point.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import AppError
from app.core.logging import configure_logging
from app.db.database import AsyncSessionLocal, create_tables, engine
from app.db.seed import seed_database

# Configure logging before anything else
configure_logging()
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown lifecycle."""
    logger.info("Starting SpendSmart backend (env=%s)…", settings.app_env)

    # Verify database connectivity before proceeding
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection OK.")
    except Exception as exc:
        logger.error(
            "\n\n"
            "╔══════════════════════════════════════════════════════════╗\n"
            "║  DATABASE CONNECTION FAILED                              ║\n"
            "╠══════════════════════════════════════════════════════════╣\n"
            "║  SpendSmart cannot connect to PostgreSQL.                ║\n"
            "║                                                          ║\n"
            "║  Make sure PostgreSQL is running and run:                ║\n"
            "║                                                          ║\n"
            "║    psql -U postgres                                      ║\n"
            "║    CREATE USER spendsmart WITH PASSWORD 'spendsmart';    ║\n"
            "║    CREATE DATABASE spendsmart OWNER spendsmart;          ║\n"
            "║    GRANT ALL PRIVILEGES ON DATABASE spendsmart           ║\n"
            "║      TO spendsmart;                                      ║\n"
            "║                                                          ║\n"
            "║  Then restart: uvicorn app.main:app --reload             ║\n"
            "║                                                          ║\n"
            "║  See: config/docs/local-setup.md for full guide          ║\n"
            "╚══════════════════════════════════════════════════════════╝\n"
            "\nError detail: %s", exc
        )
        import sys
        sys.exit(1)

    # Create tables (dev only; production uses Alembic)
    if settings.app_env in ("development", "test"):
        await create_tables()
        logger.info("Database tables ensured.")

    # Seed master data
    async with AsyncSessionLocal() as db:
        await seed_database(db)

    # Ensure upload directory exists
    import os
    os.makedirs(settings.upload_dir, exist_ok=True)

    logger.info("SpendSmart backend ready.")
    yield
    logger.info("SpendSmart backend shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SpendSmart API",
    description="Marketing Mix Optimization Platform — Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Exception handlers ────────────────────────────────────────────────────────

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    logger.warning("AppError [%d]: %s | path=%s", exc.status_code, exc.detail, request.url.path)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error_type": type(exc).__name__},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception at %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "error_type": "InternalError"},
    )


# ── Routes ────────────────────────────────────────────────────────────────────

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["health"])
async def health() -> dict:
    """Health check endpoint for load balancers / Azure App Service probes."""
    return {"status": "ok", "env": settings.app_env, "version": "1.0.0"}


@app.get("/", tags=["root"])
async def root() -> dict:
    return {
        "name": "SpendSmart API",
        "version": "1.0.0",
        "docs": "/docs",
    }

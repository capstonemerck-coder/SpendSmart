"""
Alembic environment configuration for SpendSmart.

Supports async SQLAlchemy (asyncpg) for PostgreSQL.
The database URL is pulled from app settings so it stays consistent
with what the application itself connects to.
"""
from __future__ import annotations

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import app settings and all ORM models so Base.metadata is fully populated.
from app.core.config import settings
from app.db.database import Base
import app.models.models  # noqa: F401 — side-effect import registers all tables

alembic_config = context.config

# Override the sqlalchemy.url from alembic.ini with the value from app settings.
alembic_config.set_main_option("sqlalchemy.url", settings.database_url)

if alembic_config.config_file_name is not None:
    fileConfig(alembic_config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    Generates SQL without an active database connection.
    Useful for previewing migration SQL or running in environments
    where direct DB access is restricted.
    """
    url = alembic_config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    """Configure Alembic context and execute pending migrations."""
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Create an async engine and run migrations against it."""
    connectable = async_engine_from_config(
        alembic_config.get_section(alembic_config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point for online migration mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

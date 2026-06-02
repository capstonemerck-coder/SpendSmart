"""
Database seed script — populates master tables on first run.

Seeds:
  - META_DATA (sample markets/brands)
  - ROLE_SCREEN_PERMISSIONS (RBAC map)
  - Default admin user
"""
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.models import MetaData, RoleScreenPermission, User

logger = logging.getLogger(__name__)

# ── Seed data ─────────────────────────────────────────────────────────────────

ROLE_PERMISSIONS = {
    "admin": [],
    "data scientist": ["DATA INPUT", "DATA HISTORY", "MODEL SUMMARY"],
    "brand intelligence analyst": [
        "DATA INPUT", "DATA HISTORY", "MODEL SUMMARY",
        "SCENARIO PLANNING", "SCENARIO OUTCOME", "SCENARIO COMPARISONS",
    ],
    "leadership": [
        "SCENARIO PLANNING", "SCENARIO OUTCOME", "SCENARIO COMPARISONS",
    ],
}

SEED_META = [
    {"region": "North America", "market": "US", "currency": "USD",
     "therapeutic_area": "Oncology", "brand": "Product A", "indication": "NSCLC"},
    {"region": "Europe", "market": "EU", "currency": "EUR",
     "therapeutic_area": "Oncology", "brand": "Product A", "indication": "NSCLC"},
    {"region": "Asia Pacific", "market": "APAC", "currency": "USD",
     "therapeutic_area": "Cardiology", "brand": "Product B", "indication": "HF"},
]

SEED_ADMIN = {
    "username": "admin",
    "password": "admin123",
    "full_name": "Site Administrator",
    "region": "US",
    "role": "admin",
}

SEED_USERS = [
    {
        "username": "analyst",
        "password": "analyst123",
        "full_name": "Maya Analyst",
        "region": "Asia Pacific",
        "role": "brand intelligence analyst",
    },
    {
        "username": "scientist",
        "password": "scientist123",
        "full_name": "Sam Data",
        "region": "CER",
        "role": "data scientist",
    },
]


# ── Seeder ────────────────────────────────────────────────────────────────────

async def seed_database(db: AsyncSession) -> None:
    """Idempotent seeder — safe to call on every startup."""
    await _seed_role_permissions(db)
    await _seed_metadata(db)
    await _seed_users(db)
    await db.commit()
    logger.info("Database seeding complete.")


async def _seed_role_permissions(db: AsyncSession) -> None:
    for role, screens in ROLE_PERMISSIONS.items():
        for screen in screens:
            exists = await db.execute(
                select(RoleScreenPermission).where(
                    RoleScreenPermission.role_name == role,
                    RoleScreenPermission.screen_name == screen,
                )
            )
            if not exists.scalar_one_or_none():
                db.add(RoleScreenPermission(role_name=role, screen_name=screen))
    await db.flush()
    logger.info("ROLE_SCREEN_PERMISSIONS seeded.")


async def _seed_metadata(db: AsyncSession) -> None:
    count = await db.execute(select(MetaData))
    if count.first() is not None:
        return  # Already seeded
    for meta in SEED_META:
        db.add(MetaData(**meta))
    await db.flush()
    logger.info("META_DATA seeded with %d records.", len(SEED_META))


async def _seed_users(db: AsyncSession) -> None:
    all_users = [SEED_ADMIN] + SEED_USERS
    for u in all_users:
        exists = await db.execute(
            select(User).where(User.username == u["username"])
        )
        if not exists.scalar_one_or_none():
            db.add(User(
                username=u["username"],
                password_hash=hash_password(u["password"]),
                full_name=u.get("full_name"),
                region=u.get("region"),
                role=u["role"],
                is_active=True,
            ))
    await db.flush()
    logger.info("Seed users created.")
"""
cycle_service.py

Handles all business logic for managing planning cycles (CYCLE_DEF).
A cycle groups one or more uploads under a named planning window (e.g. "Q3-2025").

All public functions return validated Pydantic response schemas — never raw ORM objects.
Cascade rules: deleting a cycle that has associated upload records is blocked at this
layer rather than the DB level, so the error message is human-readable.
"""
from __future__ import annotations

import logging
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.models import CycleDef, Upload
from app.schemas.schemas import CycleCreate, CycleOut, CycleUpdate

logger = logging.getLogger(__name__)


async def create_cycle(
    payload: CycleCreate,
    created_by: int,
    db: AsyncSession,
) -> CycleOut:
    """
    Create a new planning cycle.

    Args:
        payload:    Cycle creation payload including cycle_id and optional metadata.
        created_by: user_id of the authenticated user creating the cycle.
        db:         Async database session.

    Returns:
        CycleOut schema populated from the newly created CycleDef record.

    Raises:
        ConflictError: If a cycle with the given cycle_id already exists.
    """
    existing = await db.execute(
        select(CycleDef).where(CycleDef.cycle_id == payload.cycle_id)
    )
    if existing.scalar_one_or_none():
        raise ConflictError(f"Cycle '{payload.cycle_id}' already exists.")

    cycle = CycleDef(
        cycle_id=payload.cycle_id,
        metadata_id=payload.metadata_id,
        target_variable=payload.target_variable,
        time_granularity=payload.time_granularity,
        cycle_start_date=payload.cycle_start_date,
        cycle_end_date=payload.cycle_end_date,
        description=payload.description,
        is_active=True,
        created_by=created_by,
    )
    db.add(cycle)
    await db.flush()
    await db.refresh(cycle)
    logger.info("Cycle '%s' created by user_id=%d", cycle.cycle_id, created_by)
    return CycleOut.model_validate(cycle)


async def get_all_cycles(db: AsyncSession) -> List[CycleOut]:
    """
    Return all planning cycles ordered by creation date descending.

    Args:
        db: Async database session.

    Returns:
        List of CycleOut schemas.
    """
    result = await db.execute(
        select(CycleDef).order_by(CycleDef.created_at.desc())
    )
    cycles = result.scalars().all()
    return [CycleOut.model_validate(c) for c in cycles]


async def get_cycle_by_id(cycle_id: str, db: AsyncSession) -> CycleOut:
    """
    Return a single planning cycle by its string identifier.

    Args:
        cycle_id: The primary key / identifier of the cycle (e.g. "Q3-2025").
        db:       Async database session.

    Returns:
        CycleOut schema.

    Raises:
        NotFoundError: If no cycle with the given cycle_id exists.
    """
    result = await db.execute(
        select(CycleDef).where(CycleDef.cycle_id == cycle_id)
    )
    cycle = result.scalar_one_or_none()
    if not cycle:
        raise NotFoundError(f"Cycle '{cycle_id}' not found.")
    return CycleOut.model_validate(cycle)


async def update_cycle(
    cycle_id: str,
    payload: CycleUpdate,
    db: AsyncSession,
) -> CycleOut:
    """
    Partial update of a planning cycle.

    Only fields explicitly set in the payload are updated; unset fields are left unchanged.

    Args:
        cycle_id: Identifier of the cycle to update.
        payload:  CycleUpdate schema with fields to change.
        db:       Async database session.

    Returns:
        Updated CycleOut schema.

    Raises:
        NotFoundError: If the cycle does not exist.
    """
    result = await db.execute(
        select(CycleDef).where(CycleDef.cycle_id == cycle_id)
    )
    cycle = result.scalar_one_or_none()
    if not cycle:
        raise NotFoundError(f"Cycle '{cycle_id}' not found.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cycle, field, value)

    await db.flush()
    await db.refresh(cycle)
    return CycleOut.model_validate(cycle)


async def delete_cycle(cycle_id: str, db: AsyncSession) -> None:
    """
    Delete a planning cycle.

    Blocked if the cycle has any associated upload records, because deleting a cycle
    with uploads would orphan the data. The caller must delete uploads first.

    Args:
        cycle_id: Identifier of the cycle to delete.
        db:       Async database session.

    Raises:
        NotFoundError: If the cycle does not exist.
        ConflictError: If the cycle has one or more associated upload records.
    """
    result = await db.execute(
        select(CycleDef).where(CycleDef.cycle_id == cycle_id)
    )
    cycle = result.scalar_one_or_none()
    if not cycle:
        raise NotFoundError(f"Cycle '{cycle_id}' not found.")

    uploads_check = await db.execute(
        select(Upload).where(Upload.cycle_id == cycle_id).limit(1)
    )
    if uploads_check.scalar_one_or_none():
        raise ConflictError(
            f"Cycle '{cycle_id}' has associated upload records and cannot be deleted. "
            "Delete all uploads for this cycle first."
        )

    await db.delete(cycle)
    await db.flush()
    logger.info("Cycle '%s' deleted.", cycle_id)

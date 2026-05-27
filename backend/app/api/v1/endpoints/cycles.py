"""
Cycle management endpoints.

GET  /api/v1/cycles        → list cycles
POST /api/v1/cycles        → create cycle
GET  /api/v1/cycles/{id}   → get cycle
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.exceptions import ConflictError, NotFoundError
from app.db.database import get_db
from app.models.models import CycleDef, User
from app.schemas.schemas import CycleCreate, CycleOut

router = APIRouter(prefix="/cycles", tags=["cycles"])


@router.get("", response_model=List[CycleOut])
async def list_cycles(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[CycleDef]:
    result = await db.execute(select(CycleDef).order_by(CycleDef.created_at.desc()))
    return list(result.scalars().all())


@router.post("", response_model=CycleOut, status_code=201)
async def create_cycle(
    body: CycleCreate,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CycleDef:
    existing = await db.execute(
        select(CycleDef).where(CycleDef.cycle_id == body.cycle_id)
    )
    if existing.scalar_one_or_none():
        raise ConflictError(f"Cycle '{body.cycle_id}' already exists.")

    cycle = CycleDef(**body.model_dump())
    db.add(cycle)
    await db.flush()
    await db.refresh(cycle)
    return cycle


@router.get("/{cycle_id}", response_model=CycleOut)
async def get_cycle(
    cycle_id: str,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CycleDef:
    result = await db.execute(
        select(CycleDef).where(CycleDef.cycle_id == cycle_id)
    )
    cycle = result.scalar_one_or_none()
    if not cycle:
        raise NotFoundError(f"Cycle '{cycle_id}' not found.")
    return cycle

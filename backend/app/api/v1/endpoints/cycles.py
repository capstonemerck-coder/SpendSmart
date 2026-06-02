"""
Cycle management endpoints.

GET    /api/v1/cycles              → list all cycles (all authenticated users)
POST   /api/v1/cycles              → create a cycle (Admin, Data Scientist)
GET    /api/v1/cycles/{cycle_id}   → get a single cycle (all authenticated users)
PUT    /api/v1/cycles/{cycle_id}   → update a cycle (Admin only)
DELETE /api/v1/cycles/{cycle_id}   → delete a cycle (Admin only; blocked if has uploads)
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_admin
from app.core.exceptions import AuthorizationError
from app.db.database import get_db
from app.models.models import User
from app.schemas.schemas import CycleCreate, CycleOut, CycleUpdate
from app.services import cycle_service

router = APIRouter(prefix="/cycles", tags=["cycles"])

# Roles that may create cycles.
_UPLOAD_ROLES = {"admin", "data scientist"}


@router.get(
    "",
    response_model=List[CycleOut],
    summary="List all planning cycles",
    description="Returns all planning cycles ordered by creation date descending. "
                "Accessible to all authenticated users.",
)
async def list_cycles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[CycleOut]:
    """Return all planning cycles."""
    return await cycle_service.get_all_cycles(db)


@router.post(
    "",
    response_model=CycleOut,
    status_code=201,
    summary="Create a planning cycle",
    description="Creates a new named planning cycle. "
                "Restricted to Admin and Data Scientist roles.",
)
async def create_cycle(
    body: CycleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CycleOut:
    """Create a new planning cycle and associate it with the creating user."""
    if current_user.role not in _UPLOAD_ROLES:
        raise AuthorizationError("Only Admins and Data Scientists can create cycles.")
    return await cycle_service.create_cycle(body, current_user.user_id, db)


@router.get(
    "/{cycle_id}",
    response_model=CycleOut,
    summary="Get a planning cycle",
    description="Returns a single planning cycle by its identifier. "
                "Accessible to all authenticated users.",
)
async def get_cycle(
    cycle_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CycleOut:
    """Return a single planning cycle by cycle_id."""
    return await cycle_service.get_cycle_by_id(cycle_id, db)


@router.put(
    "/{cycle_id}",
    response_model=CycleOut,
    summary="Update a planning cycle",
    description="Partially updates a planning cycle (description, is_active, date range). "
                "Restricted to Admin role.",
)
async def update_cycle(
    cycle_id: str,
    body: CycleUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> CycleOut:
    """Partially update a planning cycle. Admin only."""
    return await cycle_service.update_cycle(cycle_id, body, db)


@router.delete(
    "/{cycle_id}",
    status_code=200,
    summary="Delete a planning cycle",
    description="Deletes a planning cycle. Blocked if the cycle has any associated uploads. "
                "Restricted to Admin role.",
)
async def delete_cycle(
    cycle_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a planning cycle. Admin only. Blocked if the cycle has uploads."""
    await cycle_service.delete_cycle(cycle_id, db)
    return {"detail": f"Cycle '{cycle_id}' deleted."}

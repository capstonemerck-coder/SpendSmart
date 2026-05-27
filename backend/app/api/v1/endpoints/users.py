"""
User management endpoints (admin-only).

GET    /api/v1/users          → list all users
POST   /api/v1/users          → create user
GET    /api/v1/users/{id}     → get user
PATCH  /api/v1/users/{id}     → update user (role, permissions, active)
DELETE /api/v1/users/{id}     → delete user
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_admin
from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.db.database import get_db
from app.models.models import User
from app.schemas.schemas import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserOut])
async def list_users(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> List[User]:
    result = await db.execute(select(User).order_by(User.created_at))
    return list(result.scalars().all())


@router.post("", response_model=UserOut, status_code=201)
async def create_user(
    body: UserCreate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Check uniqueness
    existing = await db.execute(
        select(User).where(User.username == body.username.strip().lower())
    )
    if existing.scalar_one_or_none():
        raise ConflictError(f"Username '{body.username}' already exists.")

    user = User(
        username=body.username.strip().lower(),
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        email=body.email,
        region=body.region,
        role=body.role,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: int,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError(f"User {user_id} not found.")
    return user


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    body: UserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError(f"User {user_id} not found.")

    update_data = body.model_dump(exclude_none=True, exclude={"permissions"})
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.flush()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    if current_user.user_id == user_id:
        raise ConflictError("Cannot delete your own account.")

    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError(f"User {user_id} not found.")
    if user.role == "admin":
        raise ConflictError("Admin users cannot be deleted.")

    await db.delete(user)
    await db.flush()

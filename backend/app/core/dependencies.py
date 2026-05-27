"""
FastAPI dependency that extracts and validates the JWT bearer token,
then loads the current user from the database.
"""
from __future__ import annotations

from typing import Optional

from fastapi import Depends, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.models import RoleScreenPermission, User

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validate JWT and return the authenticated User ORM instance.

    Raises:
        AuthenticationError: If token is missing, invalid, or user not found.
    """
    if credentials is None:
        raise AuthenticationError("Bearer token required.")

    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError as exc:
        raise AuthenticationError(f"Invalid or expired token: {exc}") from exc

    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise AuthenticationError("Token payload missing 'sub' claim.")

    result = await db.execute(
        select(User).where(User.user_id == int(user_id), User.is_active.is_(True))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise AuthenticationError("User not found or deactivated.")

    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Restrict endpoint to admin role."""
    if current_user.role != "admin":
        raise AuthorizationError("Admin role required.")
    return current_user


async def require_permission(screen: str, current_user: User, db: AsyncSession) -> None:
    """
    Verify user has permission to access a specific screen.
    Falls back to ROLE_SCREEN_PERMISSIONS table if not admin.
    """
    if current_user.role == "admin":
        return  # admins bypass screen checks
    result = await db.execute(
        select(RoleScreenPermission).where(
            RoleScreenPermission.role_name == current_user.role,
            RoleScreenPermission.screen_name == screen,
        )
    )
    if result.scalar_one_or_none() is None:
        raise AuthorizationError(f"Access denied to screen: {screen}")

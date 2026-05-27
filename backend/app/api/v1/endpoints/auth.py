"""
Authentication endpoints.

POST /api/v1/auth/login   → issue JWT
POST /api/v1/auth/logout  → client-side only (stateless JWT)
GET  /api/v1/auth/me      → current user info
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.exceptions import AuthenticationError
from app.core.security import create_access_token, verify_password
from app.db.database import get_db
from app.models.models import RoleScreenPermission, User
from app.schemas.schemas import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

_ROLE_DEFAULT_PERMISSIONS = {
    "admin": [],
    "data scientist": ["DATA INPUT", "DATA HISTORY", "MODEL SUMMARY"],
    "brand intelligence analyst": [
        "DATA INPUT", "DATA HISTORY", "MODEL SUMMARY",
        "SCENARIO PLANNING", "SCENARIO OUTCOME", "SCENARIO COMPARISONS",
    ],
    "leadership": ["SCENARIO PLANNING", "SCENARIO OUTCOME", "SCENARIO COMPARISONS"],
}


@router.post("/login", response_model=TokenResponse, summary="Login and obtain JWT")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """
    Authenticate with username + password.
    Returns a JWT access token valid for `ACCESS_TOKEN_EXPIRE_MINUTES`.
    """
    result = await db.execute(
        select(User).where(
            User.username == body.username.strip().lower(),
            User.is_active.is_(True),
        )
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise AuthenticationError("Invalid username or password.")

    # Load permissions from ROLE_SCREEN_PERMISSIONS
    perms_result = await db.execute(
        select(RoleScreenPermission.screen_name).where(
            RoleScreenPermission.role_name == user.role
        )
    )
    permissions = [row[0] for row in perms_result.fetchall()]

    # Fall back to hardcoded defaults if table not seeded
    if not permissions:
        permissions = _ROLE_DEFAULT_PERMISSIONS.get(user.role, [])

    token = create_access_token(
        subject=user.user_id,
        extra={"role": user.role, "username": user.username},
    )

    return TokenResponse(
        access_token=token,
        user_id=user.user_id,
        username=user.username,
        role=user.role,
        permissions=permissions,
    )


@router.get("/me", response_model=UserOut, summary="Current authenticated user")
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user

"""
Authentication endpoints.

POST /api/v1/auth/login   → authenticate with email + password, issue JWT
GET  /api/v1/auth/me      → return current authenticated user with permissions
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import create_access_token, verify_password
from app.db.database import get_db
from app.models.models import RoleScreenPermission, User
from app.schemas.schemas import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

# Default permissions per role — used as fallback if ROLE_SCREEN_PERMISSIONS is not seeded.
_ROLE_DEFAULT_PERMISSIONS: dict[str, list[str]] = {
    "admin": [],
    "data scientist": ["DATA INPUT", "DATA HISTORY", "MODEL SUMMARY"],
    "brand intelligence analyst": [
        "DATA INPUT", "DATA HISTORY", "MODEL SUMMARY",
        "SCENARIO PLANNING", "SCENARIO OUTCOME", "SCENARIO COMPARISONS",
    ],
    "leadership": ["SCENARIO PLANNING", "SCENARIO OUTCOME", "SCENARIO COMPARISONS"],
}


async def _load_permissions(role: str, db: AsyncSession) -> list[str]:
    """
    Load screen permissions for a role from ROLE_SCREEN_PERMISSIONS.
    Falls back to hardcoded defaults if the table has not been seeded.

    Args:
        role: The user's role string (e.g. "data scientist").
        db:   Active database session.

    Returns:
        List of screen name strings the role may access.
    """
    result = await db.execute(
        select(RoleScreenPermission.screen_name).where(
            RoleScreenPermission.role_name == role
        )
    )
    permissions = [row[0] for row in result.fetchall()]
    if not permissions:
        permissions = _ROLE_DEFAULT_PERMISSIONS.get(role, [])
    return permissions


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and obtain JWT",
    description=(
        "Authenticate with email + password. "
        "Returns a JWT access token valid for ACCESS_TOKEN_EXPIRE_MINUTES. "
        "Returns 401 for invalid credentials and 403 for deactivated accounts."
    ),
)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """
    Authenticate a user by email and password.

    Lookup order:
      1. Find user by email (case-insensitive).
      2. Verify password — raises 401 if no match.
      3. Check is_active — raises 403 if deactivated.
      4. Load screen permissions and issue a signed JWT.

    Args:
        body: LoginRequest containing email and password.
        db:   Database session injected by FastAPI.

    Returns:
        TokenResponse with access_token, user info, and screen permissions.

    Raises:
        AuthenticationError: If email is not found or password is incorrect (401).
        AuthorizationError:  If the account is deactivated (403).
    """
    result = await db.execute(
        select(User).where(User.email == body.email.strip().lower())
    )
    user = result.scalar_one_or_none()

    # Check credentials before checking active status — prevents user enumeration
    # by ensuring both invalid-credentials and not-found return identical 401.
    if user is None or not verify_password(body.password, user.password_hash):
        raise AuthenticationError("Invalid email or password.")

    if not user.is_active:
        raise AuthorizationError(
            "This account has been deactivated. Contact your administrator."
        )

    permissions = await _load_permissions(user.role, db)

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


@router.get(
    "/me",
    response_model=UserOut,
    summary="Current authenticated user",
    description=(
        "Validate the bearer token and return the authenticated user's full profile, "
        "including role-based screen permissions. Returns 401 if the token is missing "
        "or expired."
    ),
)
async def me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """
    Return the current user's profile and screen permissions.

    Decodes the JWT via get_current_user, then loads permissions from
    ROLE_SCREEN_PERMISSIONS so the client always receives an up-to-date
    permission list regardless of when the token was issued.

    Args:
        current_user: Authenticated User ORM instance from JWT dependency.
        db:           Database session for permissions query.

    Returns:
        UserOut with all profile fields and current screen permissions.
    """
    permissions = await _load_permissions(current_user.role, db)

    return UserOut(
        user_id=current_user.user_id,
        username=current_user.username,
        full_name=current_user.full_name,
        email=current_user.email,
        region=current_user.region,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        permissions=permissions,
    )

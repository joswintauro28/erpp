from datetime import datetime, timezone

import sqlalchemy as sa
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.config import settings
from app.models.organization import Organization, OrganizationMember, Role
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
)
from app.schemas.user import UserMe
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    user, access_token, raw_refresh = await service.authenticate(
        req.email, req.password, request
    )

    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        secure=settings.ENV == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_SECONDS,
        path="/api/auth",
    )

    return LoginResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_SECONDS,
        user_id=user.id,
    )


@router.post("/register", response_model=RegisterResponse)
async def register(
    req: RegisterRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)

    try:
        user = await service.register(req.email, req.password, req.full_name)
    except ValueError as e:
        from app.core.exceptions import ConflictException
        raise ConflictException(str(e))

    # Auto-create organization for new user
    org = Organization(
        name=f"{user.full_name or user.email}'s Organization",
        owner_id=user.id,
    )
    db.add(org)
    await db.flush()

    # Assign Organization Owner role
    role_stmt = sa.select(Role).where(Role.name == "Organization Owner")
    role_result = await db.execute(role_stmt)
    owner_role = role_result.scalar_one_or_none()

    if owner_role:
        member = OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            role_id=owner_role.id,
            status="active",
        )
        db.add(member)
        await db.flush()

    # Create default settings
    from app.models.settings import CompanySetting, BrandingSetting, NotificationSetting, WorkflowSettings

    db.add(CompanySetting(owner_id=user.id, company_name=user.full_name or user.email))
    db.add(BrandingSetting(owner_id=user.id))
    db.add(NotificationSetting(owner_id=user.id))
    db.add(WorkflowSettings(owner_id=user.id))
    await db.flush()

    # Auto-login after registration
    _, access_token, raw_refresh = await service.authenticate(
        req.email, req.password, request
    )

    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        secure=settings.ENV == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_SECONDS,
        path="/api/auth",
    )

    return RegisterResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_SECONDS,
        user_id=user.id,
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    raw_refresh = request.cookies.get("refresh_token")
    if not raw_refresh:
        from app.core.exceptions import CredentialsException
        raise CredentialsException("No refresh token provided")

    service = AuthService(db)
    _, new_access_token = await service.refresh_access_token(raw_refresh)

    return RefreshResponse(
        access_token=new_access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_SECONDS,
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    raw_refresh = request.cookies.get("refresh_token")
    if raw_refresh:
        service = AuthService(db)
        await service.revoke_refresh_token(raw_refresh)

    response.delete_cookie(
        key="refresh_token",
        path="/api/auth",
        httponly=True,
        secure=settings.ENV == "production",
        samesite="lax",
    )

    return LogoutResponse()


@router.post("/logout/all", response_model=LogoutResponse)
async def logout_all(
    request: Request,
    response: Response,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    await service.revoke_all_user_tokens(user_id)

    response.delete_cookie(
        key="refresh_token",
        path="/api/auth",
        httponly=True,
        secure=settings.ENV == "production",
        samesite="lax",
    )

    return LogoutResponse(message="Logged out of all sessions")


@router.get("/users/me", response_model=UserMe)
async def get_me(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    stmt = sa.select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("User not found")

    org_name = None
    org_id = None
    role_name = None
    permissions: list[str] = []

    member_stmt = (
        sa.select(OrganizationMember)
        .where(
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == "active",
        )
    )
    member_result = await db.execute(member_stmt)
    member = member_result.scalar_one_or_none()

    if member:
        org_stmt = sa.select(Organization).where(Organization.id == member.organization_id)
        org_result = await db.execute(org_stmt)
        org = org_result.scalar_one_or_none()
        if org:
            org_id = org.id
            org_name = org.name

        role_stmt = sa.select(Role).where(Role.id == member.role_id)
        role_result = await db.execute(role_stmt)
        role = role_result.scalar_one_or_none()
        if role:
            role_name = role.name

    return UserMe(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        last_login=user.last_login,
        created_at=user.created_at,
        organization_id=org_id,
        organization_name=org_name,
        role=role_name,
        permissions=permissions,
    )

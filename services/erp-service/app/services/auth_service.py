from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.core.permissions import user_organization_id
from app.core.security import create_access_token, hash_password, verify_password
from app.models.organization import OrganizationMember, Role
from app.models.user import User


def register_user(db: Session, email: str, password: str) -> User:
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise ConflictException("Email already registered")

    user = User(email=email, password_hash=hash_password(password))
    db.add(user)
    db.flush()
    return user


def authenticate_user(db: Session, email: str, password: str) -> tuple[str, User]:
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user:
        raise ForbiddenException("Invalid credentials")

    if not verify_password(password, user.password_hash):
        raise ForbiddenException("Invalid credentials")

    org_id = user_organization_id(db, user.id)
    role_name = None
    if org_id:
        membership = db.execute(
            select(OrganizationMember).where(
                OrganizationMember.user_id == user.id,
                OrganizationMember.status == "active",
            ).order_by(OrganizationMember.id).limit(1)
        ).scalar_one_or_none()
        if membership and membership.role_id:
            role = db.execute(select(Role).where(Role.id == membership.role_id)).scalar_one_or_none()
            if role:
                role_name = role.name

    if not org_id:
        raise ForbiddenException("Access denied. Please use the Client Portal login.")

    payload = {
        "user_id": user.id,
        "organization_id": org_id,
        "role": role_name,
    }
    token = create_access_token(payload)

    user.last_login = None  # updated on login
    db.flush()

    return token, user


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()

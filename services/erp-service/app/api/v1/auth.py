from fastapi import APIRouter, Depends, Form
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.core.permissions import PERMISSION_CODES, user_organization_id
from app.models.organization import OrganizationMember, Permission, Role, RolePermission
from app.models.user import User
from app.schemas.auth import LoginResponse
from app.schemas.user import UserMe
from app.services.auth_service import authenticate_user, register_user

router = APIRouter(tags=["Authentication"])


class RegisterBody(BaseModel):
    email: EmailStr
    password: str


@router.post("/login", response_model=LoginResponse)
def login(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    token, _user = authenticate_user(db, username, password)
    return LoginResponse(access_token=token)


@router.post("/users/", response_model=LoginResponse)
def register(body: RegisterBody, db: Session = Depends(get_db)):
    user = register_user(db, body.email, body.password)
    db.commit()
    token, _user = authenticate_user(db, body.email, body.password)
    return LoginResponse(access_token=token)


@router.get("/users/me", response_model=UserMe)
def get_me(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    org_id = user_organization_id(db, user_id)
    org_name = None
    role_name = None
    permissions: list[str] = []

    if org_id:
        membership = db.query(OrganizationMember).filter(
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == "active",
        ).order_by(OrganizationMember.id).first()
        if membership and membership.role_id:
            role = db.query(Role).filter(Role.id == membership.role_id).first()
            if role:
                role_name = role.name
                org = membership.organization
                org_name = org.name if org else None
                if role.name == "Organization Owner":
                    permissions = PERMISSION_CODES.copy()
                else:
                    rps = db.query(RolePermission).filter(RolePermission.role_id == role.id).all()
                    for rp in rps:
                        perm = db.query(Permission).filter(Permission.id == rp.permission_id).first()
                        if perm:
                            permissions.append(perm.code)

    return UserMe(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        last_login=user.last_login,
        organization_id=org_id,
        organization_name=org_name,
        role=role_name,
        permissions=permissions,
    )

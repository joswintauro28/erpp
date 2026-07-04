from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.auth.oauth2 import create_access_token, get_current_user
from app.auth.permissions import get_auth_context
from app.database import get_db
from app.services.audit import log_action
from app.utils import verify

router = APIRouter(tags=["Authentication"])


@router.post("/login")
def login(user_credentials: OAuth2PasswordRequestForm = Depends()):
    with get_db() as connection:
        with connection.cursor() as cur:
            cur.execute(
                "SELECT * FROM users WHERE email = %s",
                (user_credentials.username,),
            )
            user = cur.fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid credentials",
        )

    if not verify(
        user_credentials.password,
        user.get("password_hash") or user.get("password"),
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid credentials",
        )

    auth_ctx = get_auth_context(user["id"])

    if not auth_ctx or not auth_ctx.get("organization_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Please use the Client Portal login.",
        )

    payload = {
        "user_id": user["id"],
        "organization_id": auth_ctx["organization_id"],
        "role": auth_ctx["role"],
        "permissions": auth_ctx["permissions"],
    }

    access_token = create_access_token(payload)

    log_action(
        user["id"],
        user["id"],
        "login",
        "authentication",
        user["id"],
        "User logged in",
        {"email": user.get("email")},
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
def logout(current_user: int = Depends(get_current_user)):
    log_action(
        current_user,
        current_user,
        "logout",
        "authentication",
        current_user,
        "User logged out",
    )
    return {"message": "Logged out"}

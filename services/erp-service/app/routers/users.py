from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.oauth2 import get_current_user
from app.auth.permissions import get_auth_context
from app.database import get_db
from app.schemas.user import UserCreate
from app.utils import hash

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/")
def create_user(user: UserCreate):
    try:
        with get_db() as connection:
            with connection.cursor() as cur:
                cur.execute(
                    "SELECT id FROM users WHERE email = %s",
                    (user.email,),
                )
                if cur.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Email already registered",
                    )

                hashed_password = hash(user.password)
                cur.execute(
                    """
                    INSERT INTO users (email, password_hash)
                    VALUES (%s, %s)
                    RETURNING id, email, created_at
                    """,
                    (user.email, hashed_password),
                )
                new_user = cur.fetchone()
            connection.commit()

        return {"data": new_user}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get("/me")
def get_me(current_user: int = Depends(get_current_user)):
    ctx = get_auth_context(current_user)
    if not ctx:
        raise HTTPException(status_code=404, detail="User not found")
    return ctx

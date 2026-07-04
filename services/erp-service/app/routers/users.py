from fastapi import APIRouter, HTTPException, status
from psycopg2 import errors
from fastapi import Depends
from app.auth.oauth2 import get_current_user
from app.auth.oauth2 import create_access_token
from app.database import conn, cursor
from app.schemas.user import UserCreate, UserLogin
from app.utils import hash, verify
from app.auth.permissions import get_auth_context

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.post("/")
def create_user(user: UserCreate):
    try:
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (user.email,)
        )

        if cursor.fetchone():
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )

        hashed_password = hash(user.password)

        cursor.execute(
            """
            INSERT INTO users (email, password_hash)
            VALUES (%s, %s)
            RETURNING *
            """,
            (user.email, hashed_password)
        )

        new_user = cursor.fetchone()
        conn.commit()

        return {
            "data": {
                "id": new_user["id"],
                "email": new_user["email"],
                "created_at": new_user.get("created_at")
            }
        }

    except HTTPException:
        raise
    except errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/me")
def get_me(current_user: int = Depends(get_current_user)):
    ctx = get_auth_context(current_user)
    if not ctx:
        raise HTTPException(status_code=404, detail="User not found")
    return ctx

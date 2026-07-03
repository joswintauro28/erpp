import os
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

PORTAL_SECRET_KEY = os.getenv("PORTAL_SECRET_KEY", "myportalsecretkey456")
ALGORITHM = "HS256"

portal_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="portal/login")

def create_portal_access_token(data: dict):
    return jwt.encode(
        data,
        PORTAL_SECRET_KEY,
        algorithm=ALGORITHM
    )

def get_portal_user(token: str = Depends(portal_oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate portal credentials"
    )

    try:
        payload = jwt.decode(
            token,
            PORTAL_SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("user_id")
        is_portal = payload.get("portal")
        client_id = payload.get("client_id")

        if user_id is None or not is_portal or client_id is None:
            raise credentials_exception

        return {
            "user_id": int(user_id),
            "client_id": int(client_id)
        }

    except JWTError:
        raise credentials_exception

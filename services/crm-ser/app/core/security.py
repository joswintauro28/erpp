from jose import JWTError, jwt
from app.core.config import settings

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        # In core-iam, type might be 'access', but let's check it:
        if payload.get("type") != "access" and "role" not in payload:
            raise JWTError("Invalid token type")
        return payload
    except JWTError:
        raise

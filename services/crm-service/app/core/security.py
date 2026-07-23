from jose import JWTError, jwt
from app.core.config import settings

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        # Accept tokens with type='access' OR tokens with 'role' claim (legacy)
        if payload.get("type") not in (None, "access") and "role" not in payload:
            raise JWTError("Invalid token type")
        return payload
    except JWTError:
        raise

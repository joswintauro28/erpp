from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.API_RATE_LIMIT] if settings.RATE_LIMIT_ENABLED else [],
    storage_uri="memory://",
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": "Rate limit exceeded. Please try again later.",
            "detail": str(exc.detail),
        },
    )

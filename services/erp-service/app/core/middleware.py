from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

# Maximum request body size: 5 MB (JSON/API payloads)
MAX_BODY_BYTES = 5 * 1024 * 1024


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Skip restrictive Content-Security-Policy on Swagger UI & ReDoc endpoints
        if not any(request.url.path.startswith(p) for p in ["/docs", "/redoc", "/openapi.json"]):
            response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response


class RequestBodyLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests with Content-Length exceeding MAX_BODY_BYTES."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_BYTES:
            return Response(
                content='{"success":false,"error":"Payload Too Large","detail":"Request body exceeds 5 MB limit"}',
                status_code=413,
                media_type="application/json",
            )
        return await call_next(request)

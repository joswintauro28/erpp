"""Request logging middleware with request IDs, timing, and structured logging."""

import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("erp.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs every request with a unique ID, method, path, status code, and duration."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID") or str(
            uuid.uuid4()
        )[:12]
        request.state.request_id = request_id

        # Skip logging for health checks and docs
        skip_logging = request.url.path in (
            "/health",
            "/",
        ) or any(
            request.url.path.startswith(p)
            for p in ["/docs", "/redoc", "/openapi.json"]
        )

        if skip_logging:
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000

        # Attach request ID to response
        response.headers["X-Request-ID"] = request_id

        # Extract user context if present
        user_id = getattr(request.state, "user_id", None)
        user_info = f" user={user_id}" if user_id else ""

        log_line = (
            f"[{request_id}] {request.method} {request.url.path}"
            f" -> {response.status_code} ({duration_ms:.1f}ms){user_info}"
        )

        if response.status_code >= 500:
            logger.error(log_line)
        elif response.status_code >= 400:
            logger.warning(log_line)
        elif duration_ms > 2000:
            logger.warning(f"[SLOW] {log_line}")
        else:
            logger.info(log_line)

        return response

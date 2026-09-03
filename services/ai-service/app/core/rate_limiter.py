"""In-memory sliding window rate limiter."""

import time
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple in-memory sliding window rate limiter.
    
    Tracks requests per user_id with a rolling window.
    No Redis dependency — resets on service restart (acceptable for single-instance).
    """

    def __init__(self, max_requests: int = 30, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[int, list[float]] = defaultdict(list)

    def is_allowed(self, user_id: int) -> tuple[bool, dict]:
        """Check if user is within rate limit.
        
        Returns:
            (allowed, info) where info contains limit, remaining, reset_at
        """
        now = time.time()
        window_start = now - self.window_seconds

        # Prune old entries
        timestamps = self._requests[user_id]
        self._requests[user_id] = [t for t in timestamps if t > window_start]

        current_count = len(self._requests[user_id])
        remaining = max(0, self.max_requests - current_count)
        reset_at = int(window_start + self.window_seconds) if self._requests[user_id] else int(now + self.window_seconds)

        headers = {
            "X-RateLimit-Limit": str(self.max_requests),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(reset_at),
        }

        if current_count >= self.max_requests:
            retry_after = self._requests[user_id][0] + self.window_seconds - now
            headers["Retry-After"] = str(max(1, int(retry_after)))
            logger.warning("Rate limit exceeded for user %d", user_id)
            return False, headers

        # Record this request
        self._requests[user_id].append(now)
        return True, headers

    def cleanup(self, max_age: float = 3600):
        """Remove entries older than max_age seconds (call periodically)."""
        cutoff = time.time() - max_age
        stale_keys = [
            uid for uid, timestamps in self._requests.items()
            if not timestamps or timestamps[-1] < cutoff
        ]
        for uid in stale_keys:
            del self._requests[uid]


# Singleton instance
rate_limiter = RateLimiter(max_requests=30, window_seconds=60)

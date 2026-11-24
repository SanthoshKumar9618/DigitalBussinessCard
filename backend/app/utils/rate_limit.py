"""Tiny in-process sliding-window rate limiter.

Good enough for a single API instance. Use Redis (or the platform's rate
limiting) once the API runs on more than one instance.
"""
import threading
import time
from collections import deque

from fastapi import HTTPException, Request

_hits: dict[str, deque] = {}
_lock = threading.Lock()


def client_ip(request: Request) -> str:
    # Render / most proxies put the real client first in X-Forwarded-For.
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check(key: str, limit: int, window_seconds: int) -> None:
    now = time.monotonic()
    with _lock:
        q = _hits.setdefault(key, deque())
        while q and now - q[0] > window_seconds:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
        q.append(now)
        if len(_hits) > 10_000:  # keep memory bounded
            for k in [k for k, v in _hits.items() if not v][:5_000]:
                _hits.pop(k, None)


def limit(name: str, limit: int, window_seconds: int):
    """FastAPI dependency: at most `limit` calls per client IP per window."""
    def _dep(request: Request) -> None:
        from app.config.settings import settings
        if settings.RATE_LIMITS_ENABLED:
            check(f"{name}:{client_ip(request)}", limit, window_seconds)
    return _dep


def check_key(name: str, key: str, limit: int, window_seconds: int) -> None:
    """Limit by an arbitrary key (e.g. the email being attacked), across all IPs."""
    from app.config.settings import settings
    if settings.RATE_LIMITS_ENABLED and key:
        check(f"{name}:{key.strip().lower()}", limit, window_seconds)

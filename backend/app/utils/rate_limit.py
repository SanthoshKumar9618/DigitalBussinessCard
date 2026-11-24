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

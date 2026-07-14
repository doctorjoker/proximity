from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from .contracts import HandlerResult
from .retry_policy import RetryPolicy


AttemptCallable = Callable[[int], Awaitable[HandlerResult]]
AttemptObserver = Callable[[dict[str, Any]], None]


@dataclass(slots=True)
class RetryExecution:
    result: HandlerResult
    attempts: int
    history: list[dict[str, Any]]


class RetryEngine:
    """Execute one handler according to a normalized retry policy."""

    async def execute(
        self,
        *,
        operation: AttemptCallable,
        policy: RetryPolicy,
        on_attempt: AttemptObserver | None = None,
    ) -> RetryExecution:
        history: list[dict[str, Any]] = []
        attempt = 0

        while True:
            attempt += 1
            result = await operation(attempt)
            entry = {
                "attempt": attempt,
                "success": result.success,
                "code": result.code,
                "message": result.message,
            }
            history.append(entry)
            if on_attempt:
                on_attempt(dict(entry))

            if result.success:
                return RetryExecution(result=result, attempts=attempt, history=history)

            if not policy.can_retry(attempt=attempt, error_code=result.code):
                return RetryExecution(result=result, attempts=attempt, history=history)

            delay_ms = policy.delay_for_attempt(attempt + 1)
            history[-1]["retry_delay_ms"] = delay_ms
            if delay_ms:
                await asyncio.sleep(delay_ms / 1000)

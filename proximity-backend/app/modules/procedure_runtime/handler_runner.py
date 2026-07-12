from __future__ import annotations

import inspect
from time import perf_counter
from typing import Any, Awaitable, Callable, Mapping

from .context import RuntimeContext
from .contracts import HandlerResult
from .exceptions import HandlerExecutionError, HandlerNotFoundError

HandlerCallable = Callable[[RuntimeContext], Any | Awaitable[Any]]


class HandlerRunner:
    """Resolve and execute procedure handlers through one normalized contract."""

    def __init__(self, handlers: Mapping[str, HandlerCallable] | None = None):
        self.handlers = dict(handlers or {})

    def register(self, name: str, handler: HandlerCallable) -> None:
        if not name or not callable(handler):
            raise ValueError("Handler name and callable are required")
        self.handlers[name] = handler

    def register_many(self, handlers: Mapping[str, HandlerCallable]) -> None:
        for name, handler in handlers.items():
            self.register(name, handler)

    def has_handler(self, name: str) -> bool:
        return name in self.handlers

    async def run(
        self,
        *,
        handler_name: str,
        context: RuntimeContext,
    ) -> HandlerResult:
        handler = self.handlers.get(handler_name)
        if handler is None:
            raise HandlerNotFoundError(
                f"Procedure handler '{handler_name}' is not registered",
                details={"handler": handler_name},
            )

        started = perf_counter()
        try:
            value = handler(context)
            if inspect.isawaitable(value):
                value = await value
            result = HandlerResult.from_value(value)
        except Exception as exc:
            raise HandlerExecutionError(
                f"Handler '{handler_name}' failed: {exc}",
                details={"handler": handler_name, "exception": type(exc).__name__},
            ) from exc
        finally:
            duration_ms = max(0, int((perf_counter() - started) * 1000))
            durations = context.metrics.setdefault("handler_durations_ms", {})
            durations[handler_name] = duration_ms

        for key, value in result.output.items():
            context.set_output(key, value)

        if result.metrics:
            handler_metrics = context.metrics.setdefault("handler_metrics", {})
            handler_metrics[handler_name] = dict(result.metrics)

        return result

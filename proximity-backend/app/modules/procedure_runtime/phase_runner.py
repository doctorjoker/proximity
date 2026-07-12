from __future__ import annotations

from dataclasses import dataclass, field
from time import perf_counter
from typing import Any, Mapping

from .context import RuntimeContext
from .contracts import HandlerResult
from .exceptions import HandlerExecutionError, HandlerNotFoundError, PhaseExecutionError
from .handler_runner import HandlerRunner

PHASE_PENDING = "PENDING"
PHASE_RUNNING = "RUNNING"
PHASE_SUCCESS = "SUCCESS"
PHASE_FAILED = "FAILED"
PHASE_SKIPPED = "SKIPPED"


@dataclass(slots=True)
class PhaseResult:
    phase_key: str
    phase_name: str
    handler_name: str
    status: str
    duration_ms: int = 0
    handler_result: HandlerResult | None = None
    error: dict[str, Any] | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def success(self) -> bool:
        return self.status == PHASE_SUCCESS

    def to_dict(self) -> dict[str, Any]:
        return {
            "phase_key": self.phase_key,
            "phase_name": self.phase_name,
            "handler_name": self.handler_name,
            "status": self.status,
            "duration_ms": self.duration_ms,
            "success": self.success,
            "handler_result": self.handler_result.to_dict() if self.handler_result else None,
            "error": self.error,
            "metadata": dict(self.metadata),
        }


class PhaseRunner:
    """Execute one procedure phase and normalize its lifecycle/result."""

    def __init__(self, handler_runner: HandlerRunner):
        self.handler_runner = handler_runner

    async def run(
        self,
        *,
        phase: Mapping[str, Any],
        context: RuntimeContext,
    ) -> PhaseResult:
        phase_key = str(
            phase.get("phase_code")
            or phase.get("id")
            or phase.get("phase_order")
            or phase.get("name")
            or "PHASE"
        )
        phase_name = str(phase.get("name") or phase_key)
        handler_name = str(phase.get("handler") or phase.get("action") or "").strip()

        if not handler_name:
            raise PhaseExecutionError(
                f"Phase '{phase_name}' has no handler/action",
                details={"phase_key": phase_key, "phase_name": phase_name},
            )

        started = perf_counter()
        try:
            result = await self.handler_runner.run(
                handler_name=handler_name,
                context=context,
            )
            status = PHASE_SUCCESS if result.success else PHASE_FAILED
            error = None if result.success else {
                "code": result.code,
                "message": result.message,
            }
        except (HandlerNotFoundError, HandlerExecutionError) as exc:
            result = None
            status = PHASE_FAILED
            error = exc.to_dict()
        except Exception as exc:
            raise PhaseExecutionError(
                f"Unexpected failure in phase '{phase_name}': {exc}",
                details={"phase_key": phase_key, "handler": handler_name},
            ) from exc

        duration_ms = max(0, int((perf_counter() - started) * 1000))
        context.metrics.setdefault("phase_durations_ms", {})[phase_key] = duration_ms
        context.metrics.setdefault("counters", {})["phases_executed"] = (
            context.metrics.setdefault("counters", {}).get("phases_executed", 0) + 1
        )
        if status == PHASE_FAILED:
            context.metrics["counters"]["phases_failed"] = (
                context.metrics["counters"].get("phases_failed", 0) + 1
            )

        return PhaseResult(
            phase_key=phase_key,
            phase_name=phase_name,
            handler_name=handler_name,
            status=status,
            duration_ms=duration_ms,
            handler_result=result,
            error=error,
            metadata={"phase_order": phase.get("phase_order")},
        )

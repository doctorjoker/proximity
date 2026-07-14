from __future__ import annotations

from dataclasses import dataclass, field
from time import perf_counter
from typing import Any, Iterable, Mapping

from .context import RuntimeContext
from .contracts import HandlerResult
from .exceptions import HandlerExecutionError, HandlerNotFoundError, PhaseExecutionError
from .handler_runner import HandlerRunner
from .retry_engine import RetryEngine
from .retry_policy import RetryPolicy

PHASE_SUCCESS = "SUCCESS"
PHASE_FAILED = "FAILED"


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
    def __init__(self, handler_runner: HandlerRunner):
        self.handler_runner = handler_runner
        self.retry_engine = RetryEngine()

    @staticmethod
    def _phase_persistence(context: RuntimeContext):
        persistence = context.services.get("phase_persistence")
        return persistence if isinstance(persistence, Mapping) else None

    async def run(self, *, phase: Mapping[str, Any], context: RuntimeContext) -> PhaseResult:
        phase_key = str(phase.get("phase_code") or phase.get("id") or phase.get("phase_order") or phase.get("name") or "PHASE")
        phase_name = str(phase.get("name") or phase_key)
        handler_name = str(phase.get("handler") or phase.get("action") or "").strip()
        phase_order = phase.get("phase_order")
        if not handler_name:
            raise PhaseExecutionError(f"Phase '{phase_name}' has no handler/action")

        policy = RetryPolicy.from_phase(phase)
        persistence = self._phase_persistence(context)
        phase_record = None
        if persistence and callable(persistence.get("create")) and context.execution.get("id") is not None:
            phase_record = persistence["create"](
                execution_id=int(context.execution["id"]),
                phase_key=phase_key,
                phase_name=phase_name,
                phase_order=phase_order,
                handler_name=handler_name,
                input_json={"variables": dict(context.variables), "outputs_before": dict(context.outputs)},
                max_attempts=policy.max_attempts,
                retry_policy=policy.to_dict(),
            )

        started = perf_counter()

        async def operation(attempt: int) -> HandlerResult:
            try:
                return await self.handler_runner.run(handler_name=handler_name, context=context)
            except (HandlerNotFoundError, HandlerExecutionError) as exc:
                return HandlerResult(success=False, code=getattr(exc, "code", "HANDLER_ERROR"), message=str(exc), output={}, metrics={})
            except Exception as exc:
                return HandlerResult(success=False, code="UNEXPECTED_PHASE_ERROR", message=str(exc), output={}, metrics={})

        def observe(entry: dict[str, Any]) -> None:
            if not phase_record or not persistence or not callable(persistence.get("record_attempt")):
                return
            delay = policy.delay_for_attempt(int(entry["attempt"]) + 1) if not entry["success"] else None
            persistence["record_attempt"](
                int(phase_record["id"]),
                attempt=int(entry["attempt"]),
                success=bool(entry["success"]),
                code=entry.get("code"),
                message=entry.get("message"),
                retry_delay_ms=delay,
            )

        retry_execution = await self.retry_engine.execute(operation=operation, policy=policy, on_attempt=observe)
        result = retry_execution.result
        status = PHASE_SUCCESS if result.success else PHASE_FAILED
        error = None if result.success else {"code": result.code, "message": result.message}
        duration_ms = max(0, int((perf_counter() - started) * 1000))

        context.metrics.setdefault("phase_durations_ms", {})[phase_key] = duration_ms
        counters = context.metrics.setdefault("counters", {})
        counters["phases_executed"] = counters.get("phases_executed", 0) + 1
        counters["handler_attempts"] = counters.get("handler_attempts", 0) + retry_execution.attempts
        counters["retries_executed"] = counters.get("retries_executed", 0) + max(0, retry_execution.attempts - 1)
        if not result.success:
            counters["phases_failed"] = counters.get("phases_failed", 0) + 1

        phase_result = PhaseResult(
            phase_key=phase_key,
            phase_name=phase_name,
            handler_name=handler_name,
            status=status,
            duration_ms=duration_ms,
            handler_result=result,
            error=error,
            metadata={
                "phase_order": phase_order,
                "continue_on_error": bool(phase.get("continue_on_error", False)),
                "persistence_id": phase_record.get("id") if phase_record else None,
                "attempts": retry_execution.attempts,
                "max_attempts": policy.max_attempts,
                "retry_policy": policy.to_dict(),
                "attempt_history": retry_execution.history,
            },
        )

        if phase_record and persistence and callable(persistence.get("update")):
            persistence["update"](
                int(phase_record["id"]),
                status=status,
                duration_ms=duration_ms,
                output_json=result.to_dict(),
                error_json=error,
            )
        return phase_result

    async def run_many(self, *, phases: Iterable[Mapping[str, Any]], context: RuntimeContext) -> list[PhaseResult]:
        ordered = sorted([dict(phase) for phase in phases], key=lambda phase: (phase.get("phase_order") or 0, phase.get("id") or 0))
        results: list[PhaseResult] = []
        for phase in ordered:
            result = await self.run(phase=phase, context=context)
            results.append(result)
            if not result.success and not bool(phase.get("continue_on_error", False)):
                break
        return results

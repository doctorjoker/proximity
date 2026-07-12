from __future__ import annotations

from typing import Any, Dict, Iterable, Mapping, Optional

from .context import RuntimeContext
from .contracts import HandlerResult
from .exceptions import RuntimeValidationError
from .handler_runner import HandlerCallable, HandlerRunner
from .metrics import RuntimeMetrics
from .phase_runner import PhaseResult, PhaseRunner
from .variable_snapshot import VariableSnapshot, VariableSnapshotBuilder


class ProcedureRuntimeEngine:
    """Procedure runtime orchestrator foundation.

    EUREKA 9.5.0.2.1 adds variable snapshots plus single-phase execution while
    keeping REST, persistence, retry, rollback, and workflow scheduling outside
    this core. Those integrations are introduced in later milestones.
    """

    def __init__(
        self,
        *,
        services: Optional[Mapping[str, Any]] = None,
        handlers: Optional[Mapping[str, HandlerCallable]] = None,
        logger: Any = None,
    ):
        self.services = dict(services or {})
        self.logger = logger
        self.handler_runner = HandlerRunner(handlers)
        self.phase_runner = PhaseRunner(self.handler_runner)
        self.snapshot_builder = VariableSnapshotBuilder()

    def register_handler(self, name: str, handler: HandlerCallable) -> None:
        self.handler_runner.register(name, handler)

    def build_context(
        self,
        *,
        execution: Dict[str, Any],
        procedure: Dict[str, Any],
        version: Dict[str, Any],
        variables: Optional[Mapping[str, Any]] = None,
    ) -> RuntimeContext:
        self._validate_core_payload(execution=execution, procedure=procedure, version=version)

        metrics = RuntimeMetrics()
        return RuntimeContext(
            execution=dict(execution),
            procedure=dict(procedure),
            version=dict(version),
            variables=dict(variables or {}),
            outputs={},
            metrics=metrics.snapshot(),
            services=self.services,
            logger=self.logger,
        )

    def build_variable_snapshot(
        self,
        *,
        definitions: Iterable[Mapping[str, Any]] | None = None,
        runtime_values: Mapping[str, Any] | None = None,
        context: RuntimeContext | None = None,
    ) -> VariableSnapshot:
        snapshot = self.snapshot_builder.build(
            definitions=definitions,
            runtime_values=runtime_values,
        )
        if context is not None:
            context.variables.clear()
            context.variables.update(snapshot.to_dict())
        return snapshot

    async def run_phase(
        self,
        *,
        phase: Mapping[str, Any],
        context: RuntimeContext,
    ) -> PhaseResult:
        return await self.phase_runner.run(phase=phase, context=context)

    def normalize_handler_result(self, value: Any) -> HandlerResult:
        return HandlerResult.from_value(value)

    def _validate_core_payload(
        self,
        *,
        execution: Dict[str, Any],
        procedure: Dict[str, Any],
        version: Dict[str, Any],
    ) -> None:
        missing = []
        if not execution.get("execution_code"):
            missing.append("execution.execution_code")
        if not procedure.get("code") and not procedure.get("procedure_code"):
            missing.append("procedure.code")
        if not version.get("version") and not version.get("procedure_version"):
            missing.append("version.version")

        if missing:
            raise RuntimeValidationError(
                "Invalid procedure runtime payload",
                details={"missing": missing},
            )

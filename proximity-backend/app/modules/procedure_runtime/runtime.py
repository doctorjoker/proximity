from __future__ import annotations

from time import perf_counter
from typing import Any, Dict, Iterable, Mapping, Optional

from .context import RuntimeContext
from .contracts import HandlerResult
from .exceptions import RuntimeValidationError
from .handler_runner import HandlerCallable, HandlerRunner
from .metrics import RuntimeMetrics
from .phase_runner import PhaseResult, PhaseRunner
from .variable_snapshot import VariableSnapshot, VariableSnapshotBuilder


class ProcedureRuntimeEngine:
    """Orchestrate runtime context, variable snapshot, phases and handlers."""

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

    async def execute(
        self,
        *,
        execution: Mapping[str, Any],
        procedure: Mapping[str, Any],
        version: Mapping[str, Any],
        variable_definitions: Iterable[Mapping[str, Any]] | None,
        runtime_values: Mapping[str, Any] | None,
        phases: Iterable[Mapping[str, Any]],
    ) -> dict[str, Any]:
        """Run an execution through the runtime facade.

        EUREKA 9.5.0.2.2 deliberately keeps persistence and the existing
        Workflow Engine untouched. The caller registers an integration handler
        and supplies one or more runtime phases. This makes the new Runtime the
        execution entry point without changing the external REST contract.
        """
        started = perf_counter()
        phase_list = [dict(phase) for phase in phases]
        context = self.build_context(
            execution=dict(execution),
            procedure=dict(procedure),
            version=dict(version),
        )
        snapshot = self.build_variable_snapshot(
            definitions=variable_definitions,
            runtime_values=runtime_values,
            context=context,
        )
        phase_results = await self.phase_runner.run_many(
            phases=phase_list,
            context=context,
        )

        success = bool(phase_results) and all(result.success for result in phase_results)
        if not phase_results:
            success = False

        context.metrics["total_duration_ms"] = max(
            0,
            int((perf_counter() - started) * 1000),
        )
        context.metrics.setdefault("counters", {})["phases_requested"] = len(phase_list)

        return {
            "success": success,
            "snapshot": snapshot.to_dict(),
            "phases": [result.to_dict() for result in phase_results],
            "context": context.to_dict(),
            "metrics": dict(context.metrics),
        }

    async def execute_graph(
        self,
        *,
        execution: Mapping[str, Any],
        procedure: Mapping[str, Any],
        version: Mapping[str, Any],
        variable_definitions: Iterable[Mapping[str, Any]] | None,
        runtime_values: Mapping[str, Any] | None,
        phases: Iterable[Mapping[str, Any]],
        transitions: Iterable[Mapping[str, Any]],
    ) -> dict[str, Any]:
        """Execute phases by following the persisted Designer graph.

        EUREKA 13.0.0b supports SUCCESS and ERROR routing. A failed phase may
        follow SUCCESS only when continue_on_error is enabled and no ERROR edge
        exists. Cycles are guarded to prevent an invalid graph from running
        forever.
        """
        started = perf_counter()
        phase_list = [dict(item) for item in phases]
        edge_list = [dict(item) for item in transitions]
        context = self.build_context(
            execution=dict(execution),
            procedure=dict(procedure),
            version=dict(version),
        )
        snapshot = self.build_variable_snapshot(
            definitions=variable_definitions,
            runtime_values=runtime_values,
            context=context,
        )

        phase_by_id = {int(item["id"]): item for item in phase_list if item.get("id") is not None}
        starts = [item for item in phase_list if str(item.get("type") or "").upper() == "START"]
        if len(starts) != 1:
            raise RuntimeValidationError(
                "Native graph requires exactly one START phase",
                details={"start_count": len(starts)},
            )

        outgoing: dict[int, list[dict[str, Any]]] = {}
        for edge in edge_list:
            source_id = int(edge["source_phase_id"])
            target_id = int(edge["target_phase_id"])
            if source_id not in phase_by_id or target_id not in phase_by_id:
                raise RuntimeValidationError(
                    "Native graph contains an edge referencing an unknown phase",
                    details={"edge": edge},
                )
            outgoing.setdefault(source_id, []).append(edge)
        for values in outgoing.values():
            values.sort(key=lambda item: (int(item.get("sort_order") or 0), int(item.get("id") or 0)))

        phase_results: list[PhaseResult] = []
        executed_phases: list[dict[str, Any]] = []
        traversal: list[dict[str, Any]] = []
        current = starts[0]
        max_steps = max(100, len(phase_list) * 10)

        for step in range(1, max_steps + 1):
            result = await self.run_phase(phase=current, context=context)
            phase_results.append(result)
            executed_phases.append(current)
            current_id = int(current["id"])
            phase_type = str(current.get("type") or "ACTION").upper()

            if phase_type == "END":
                traversal.append({
                    "step": step,
                    "phase_id": current_id,
                    "phase_name": current.get("name"),
                    "result": result.status,
                    "transition": None,
                })
                break

            wanted = "SUCCESS" if result.success else "ERROR"
            candidates = [
                edge for edge in outgoing.get(current_id, [])
                if str(edge.get("transition_type") or "SUCCESS").upper() == wanted
            ]
            if not candidates and not result.success and bool(current.get("continue_on_error", False)):
                wanted = "SUCCESS"
                candidates = [
                    edge for edge in outgoing.get(current_id, [])
                    if str(edge.get("transition_type") or "SUCCESS").upper() == wanted
                ]

            if not candidates:
                traversal.append({
                    "step": step,
                    "phase_id": current_id,
                    "phase_name": current.get("name"),
                    "result": result.status,
                    "transition": None,
                    "reason": f"NO_{wanted}_TRANSITION",
                })
                break

            edge = candidates[0]
            target_id = int(edge["target_phase_id"])
            traversal.append({
                "step": step,
                "phase_id": current_id,
                "phase_name": current.get("name"),
                "result": result.status,
                "transition": {
                    "id": edge.get("id"),
                    "type": str(edge.get("transition_type") or "SUCCESS").upper(),
                    "target_phase_id": target_id,
                    "label": edge.get("label"),
                },
            })
            current = phase_by_id[target_id]
        else:
            raise RuntimeValidationError(
                "Native graph exceeded the maximum traversal length",
                details={"max_steps": max_steps, "phase_count": len(phase_list)},
            )

        reached_end = bool(phase_results) and str(current.get("type") or "").upper() == "END"
        success = reached_end and all(
            result.success or bool(phase.get("continue_on_error", False))
            for result, phase in zip(phase_results, executed_phases)
        )

        context.metrics["total_duration_ms"] = max(0, int((perf_counter() - started) * 1000))
        context.metrics.setdefault("counters", {})["phases_requested"] = len(phase_list)
        context.metrics.setdefault("counters", {})["graph_steps"] = len(phase_results)

        return {
            "success": success,
            "reached_end": reached_end,
            "snapshot": snapshot.to_dict(),
            "phases": [item.to_dict() for item in phase_results],
            "traversal": traversal,
            "context": context.to_dict(),
            "metrics": dict(context.metrics),
        }

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

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Mapping


TERMINAL_PHASE_STATES = {"SUCCESS", "FAILED", "SKIPPED"}


@dataclass(frozen=True, slots=True)
class RecoveryPlan:
    execution_id: int
    resume_phase_order: int | None
    reason: str
    completed_phase_keys: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "execution_id": self.execution_id,
            "resume_phase_order": self.resume_phase_order,
            "reason": self.reason,
            "completed_phase_keys": list(self.completed_phase_keys),
        }


class RecoveryPlanner:
    """Build a deterministic resume plan from persisted phase records.

    This foundation does not auto-resume executions yet. It identifies the first
    non-successful phase so the next milestone can safely restart from it.
    """

    def build(
        self,
        *,
        execution_id: int,
        persisted_phases: Iterable[Mapping[str, Any]],
    ) -> RecoveryPlan:
        phases = sorted(
            [dict(item) for item in persisted_phases],
            key=lambda item: (item.get("phase_order") or 0, item.get("id") or 0),
        )
        completed = tuple(
            str(item.get("phase_key"))
            for item in phases
            if str(item.get("status") or "").upper() == "SUCCESS"
        )
        candidate = next(
            (
                item for item in phases
                if str(item.get("status") or "").upper() != "SUCCESS"
            ),
            None,
        )
        return RecoveryPlan(
            execution_id=execution_id,
            resume_phase_order=(candidate.get("phase_order") if candidate else None),
            reason=("RESUME_FROM_INCOMPLETE_PHASE" if candidate else "EXECUTION_ALREADY_COMPLETE"),
            completed_phase_keys=completed,
        )

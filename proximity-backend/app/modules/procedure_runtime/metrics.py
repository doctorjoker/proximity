from __future__ import annotations

from dataclasses import dataclass, field
from time import perf_counter
from typing import Any, Dict, Optional


@dataclass(slots=True)
class RuntimeMetrics:
    """In-memory metrics collector used by the runtime core."""

    started_at_monotonic: float = field(default_factory=perf_counter)
    completed_at_monotonic: Optional[float] = None
    counters: Dict[str, int] = field(default_factory=dict)
    values: Dict[str, Any] = field(default_factory=dict)
    phase_durations_ms: Dict[str, int] = field(default_factory=dict)
    handler_durations_ms: Dict[str, int] = field(default_factory=dict)

    def increment(self, name: str, amount: int = 1) -> None:
        self.counters[name] = self.counters.get(name, 0) + amount

    def set_value(self, name: str, value: Any) -> None:
        self.values[name] = value

    def record_phase_duration(self, phase_key: str, duration_ms: int) -> None:
        self.phase_durations_ms[phase_key] = max(0, int(duration_ms))

    def record_handler_duration(self, handler_name: str, duration_ms: int) -> None:
        self.handler_durations_ms[handler_name] = max(0, int(duration_ms))

    def finish(self) -> None:
        if self.completed_at_monotonic is None:
            self.completed_at_monotonic = perf_counter()

    @property
    def total_duration_ms(self) -> int:
        end = self.completed_at_monotonic or perf_counter()
        return max(0, int((end - self.started_at_monotonic) * 1000))

    def snapshot(self) -> Dict[str, Any]:
        return {
            "total_duration_ms": self.total_duration_ms,
            "counters": dict(self.counters),
            "values": dict(self.values),
            "phase_durations_ms": dict(self.phase_durations_ms),
            "handler_durations_ms": dict(self.handler_durations_ms),
        }

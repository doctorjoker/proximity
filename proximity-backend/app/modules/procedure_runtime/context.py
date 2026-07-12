from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Mapping, MutableMapping, Optional


@dataclass(slots=True)
class RuntimeContext:
    """Mutable execution context shared by the procedure runtime.

    The object intentionally keeps transport concerns out of handlers. Handlers
    receive one context object and can read inputs, publish outputs, and record
    metrics without depending on FastAPI or repository implementations.
    """

    execution: Dict[str, Any]
    procedure: Dict[str, Any]
    version: Dict[str, Any]
    variables: MutableMapping[str, Any] = field(default_factory=dict)
    outputs: MutableMapping[str, Any] = field(default_factory=dict)
    metrics: MutableMapping[str, Any] = field(default_factory=dict)
    services: Mapping[str, Any] = field(default_factory=dict)
    logger: Optional[Any] = None

    def get_variable(self, name: str, default: Any = None) -> Any:
        return self.variables.get(name, default)

    def require_variable(self, name: str) -> Any:
        if name not in self.variables:
            raise KeyError(f"Required runtime variable '{name}' is missing")
        return self.variables[name]

    def set_output(self, name: str, value: Any) -> None:
        self.outputs[name] = value

    def add_metric(self, name: str, value: Any) -> None:
        self.metrics[name] = value

    def get_service(self, name: str) -> Any:
        if name not in self.services:
            raise KeyError(f"Runtime service '{name}' is not registered")
        return self.services[name]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "execution": dict(self.execution),
            "procedure": dict(self.procedure),
            "version": dict(self.version),
            "variables": dict(self.variables),
            "outputs": dict(self.outputs),
            "metrics": dict(self.metrics),
        }

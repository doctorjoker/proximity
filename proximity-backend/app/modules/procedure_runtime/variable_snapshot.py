from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from types import MappingProxyType
from typing import Any, Iterable, Mapping

from .exceptions import RuntimeValidationError


@dataclass(frozen=True, slots=True)
class VariableSnapshot:
    """Immutable execution-time copy of procedure variables."""

    values: Mapping[str, Any]

    def get(self, name: str, default: Any = None) -> Any:
        return self.values.get(name, default)

    def to_dict(self) -> dict[str, Any]:
        return deepcopy(dict(self.values))


class VariableSnapshotBuilder:
    def build(
        self,
        *,
        definitions: Iterable[Mapping[str, Any]] | None = None,
        runtime_values: Mapping[str, Any] | None = None,
    ) -> VariableSnapshot:
        runtime_values = dict(runtime_values or {})
        snapshot: dict[str, Any] = {}
        missing_required: list[str] = []

        for definition in definitions or []:
            name = str(definition.get("name") or "").strip()
            if not name:
                continue

            if name in runtime_values:
                value = runtime_values[name]
            else:
                value = definition.get("default_value", definition.get("defaultValue"))

            required = bool(definition.get("required"))
            if required and (value is None or value == ""):
                missing_required.append(name)

            snapshot[name] = deepcopy(value)

        # Preserve additional runtime values that are not explicit procedure variables.
        for name, value in runtime_values.items():
            snapshot.setdefault(name, deepcopy(value))

        if missing_required:
            raise RuntimeValidationError(
                "Required procedure variables are missing",
                details={"missing_variables": sorted(missing_required)},
            )

        return VariableSnapshot(MappingProxyType(snapshot))

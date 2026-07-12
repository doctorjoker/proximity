from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Mapping, Optional


@dataclass(slots=True)
class HandlerResult:
    """Normalized contract returned by every procedure handler."""

    success: bool
    code: str
    message: str = ""
    output: Dict[str, Any] = field(default_factory=dict)
    metrics: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def ok(
        cls,
        code: str = "OK",
        message: str = "",
        output: Optional[Mapping[str, Any]] = None,
        metrics: Optional[Mapping[str, Any]] = None,
    ) -> "HandlerResult":
        return cls(
            success=True,
            code=code,
            message=message,
            output=dict(output or {}),
            metrics=dict(metrics or {}),
        )

    @classmethod
    def fail(
        cls,
        code: str,
        message: str,
        output: Optional[Mapping[str, Any]] = None,
        metrics: Optional[Mapping[str, Any]] = None,
    ) -> "HandlerResult":
        return cls(
            success=False,
            code=code,
            message=message,
            output=dict(output or {}),
            metrics=dict(metrics or {}),
        )

    @classmethod
    def from_value(cls, value: Any) -> "HandlerResult":
        if isinstance(value, cls):
            return value

        if isinstance(value, dict):
            success = bool(value.get("success", True))
            code = str(
                value.get("code")
                or value.get("state")
                or ("OK" if success else "HANDLER_FAILED")
            )
            message = str(value.get("message") or value.get("reason") or "")
            output = value.get("output")
            if output is None:
                output = {
                    key: item
                    for key, item in value.items()
                    if key not in {"success", "code", "message", "reason", "metrics"}
                }
            return cls(
                success=success,
                code=code,
                message=message,
                output=dict(output or {}),
                metrics=dict(value.get("metrics") or {}),
            )

        return cls.ok(code="OK", output={"value": value})

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "code": self.code,
            "message": self.message,
            "output": dict(self.output),
            "metrics": dict(self.metrics),
        }

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable, Mapping


BACKOFF_FIXED = "FIXED"
BACKOFF_LINEAR = "LINEAR"
BACKOFF_EXPONENTIAL = "EXPONENTIAL"
VALID_BACKOFF = {BACKOFF_FIXED, BACKOFF_LINEAR, BACKOFF_EXPONENTIAL}


@dataclass(frozen=True, slots=True)
class RetryPolicy:
    enabled: bool = False
    max_attempts: int = 1
    delay_ms: int = 0
    backoff: str = BACKOFF_FIXED
    retry_on: tuple[str, ...] = field(default_factory=tuple)

    @classmethod
    def from_phase(cls, phase: Mapping[str, Any]) -> "RetryPolicy":
        raw = phase.get("retry_policy")
        if raw is None:
            raw = phase.get("retry")

        # Backward compatibility: retry: 2 means two retries after first attempt.
        if isinstance(raw, int):
            retries = max(0, raw)
            return cls(enabled=retries > 0, max_attempts=1 + retries)

        if not isinstance(raw, Mapping):
            return cls()

        enabled = bool(raw.get("enabled", True))
        max_attempts = max(1, int(raw.get("max_attempts", 1)))
        delay_ms = max(0, int(raw.get("delay_ms", 0)))
        backoff = str(raw.get("backoff", BACKOFF_FIXED)).upper()
        if backoff not in VALID_BACKOFF:
            backoff = BACKOFF_FIXED

        retry_on_raw: Iterable[Any] = raw.get("retry_on") or ()
        retry_on = tuple(str(item).upper() for item in retry_on_raw if item)
        return cls(
            enabled=enabled and max_attempts > 1,
            max_attempts=max_attempts,
            delay_ms=delay_ms,
            backoff=backoff,
            retry_on=retry_on,
        )

    def delay_for_attempt(self, next_attempt: int) -> int:
        """Return delay before next_attempt (attempt numbering starts at 1)."""
        if next_attempt <= 1 or self.delay_ms <= 0:
            return 0
        retry_index = next_attempt - 1
        if self.backoff == BACKOFF_LINEAR:
            return self.delay_ms * retry_index
        if self.backoff == BACKOFF_EXPONENTIAL:
            return self.delay_ms * (2 ** (retry_index - 1))
        return self.delay_ms

    def can_retry(self, *, attempt: int, error_code: str | None) -> bool:
        if not self.enabled or attempt >= self.max_attempts:
            return False
        if not self.retry_on:
            return True
        return str(error_code or "").upper() in self.retry_on

    def to_dict(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "max_attempts": self.max_attempts,
            "delay_ms": self.delay_ms,
            "backoff": self.backoff,
            "retry_on": list(self.retry_on),
        }

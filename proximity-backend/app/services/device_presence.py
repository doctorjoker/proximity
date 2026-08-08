from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

ONLINE_SECONDS = 300
STALE_SECONDS = 1800

TECHNICAL_TOKENS = {
    "discoveryservice",
    "probe",
}


@dataclass(frozen=True)
class PresenceSnapshot:
    state: str
    online: bool
    age_seconds: Optional[int]


def as_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def classify_presence(last_seen: Optional[datetime], now: Optional[datetime] = None) -> PresenceSnapshot:
    seen = as_utc(last_seen)
    if seen is None:
        return PresenceSnapshot("NEVER_SEEN", False, None)

    current = as_utc(now) or datetime.now(timezone.utc)
    age = max(0, int((current - seen).total_seconds()))

    if age <= ONLINE_SECONDS:
        return PresenceSnapshot("ONLINE", True, age)
    if age <= STALE_SECONDS:
        return PresenceSnapshot("STALE", False, age)
    return PresenceSnapshot("OFFLINE", False, age)


def classify_inventory_kind(
    manufacturer: Optional[str],
    product_class: Optional[str],
    model: Optional[str],
    acs_device_id: Optional[str] = None,
) -> str:
    text = " ".join(
        value.strip().lower()
        for value in (manufacturer, product_class, model, acs_device_id)
        if isinstance(value, str) and value.strip()
    )

    if "discoveryservice" in text:
        return "TECHNICAL_DISCOVERY"
    if any(token in text.split() for token in TECHNICAL_TOKENS) or "-probe-" in text:
        return "TECHNICAL_PROBE"
    if not text:
        return "UNQUALIFIED"
    return "CUSTOMER_CPE"


def is_customer_visible(kind: str) -> bool:
    return kind in {"CUSTOMER_CPE", "LAB_CPE"}

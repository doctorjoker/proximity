from __future__ import annotations

from typing import Any, Optional


_GENERIC_MODEL_NAMES = {
    "device",
    "device2",
    "igd",
    "internetgatewaydevice",
    "gateway",
    "cpe",
    "unknown",
}


def _value(node: Any) -> Optional[Any]:
    if isinstance(node, dict):
        return node.get("_value")
    return node


def _nested(payload: dict[str, Any], *path: str) -> Optional[Any]:
    current: Any = payload
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return _value(current)


def _clean(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def is_generic_model(value: Any) -> bool:
    text = _clean(value)
    if not text:
        return True
    return text.casefold() in _GENERIC_MODEL_NAMES


def resolve_model(payload: dict[str, Any], product_class: Optional[str] = None) -> Optional[str]:
    """Resolve the commercial/model identity without confusing ProductClass with model.

    ModelName from the live data model is authoritative. ProductClass is only a
    fallback when it is descriptive (for example XC220-G3v or HX141), never when
    it is a generic root identity such as Device2 or IGD.
    """
    candidates = [
        _nested(payload, "Device", "DeviceInfo", "ModelName"),
        _nested(payload, "InternetGatewayDevice", "DeviceInfo", "ModelName"),
        _nested(payload, "Device", "DeviceInfo", "ProductClass"),
        _nested(payload, "InternetGatewayDevice", "DeviceInfo", "ProductClass"),
        _nested(payload, "DeviceID", "ModelName"),
    ]

    for candidate in candidates:
        cleaned = _clean(candidate)
        if cleaned and not is_generic_model(cleaned):
            return cleaned

    fallback = _clean(product_class)
    if fallback and not is_generic_model(fallback):
        return fallback
    return None

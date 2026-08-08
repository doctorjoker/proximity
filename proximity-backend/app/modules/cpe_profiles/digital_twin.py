from __future__ import annotations

from dataclasses import asdict, is_dataclass
from typing import Any

from .digital_twin_catalog import resolve_digital_twin_extension
from .telemetry import normalize_device_telemetry


def _serialize(value: Any) -> Any:
    if is_dataclass(value):
        return {key: _serialize(item) for key, item in asdict(value).items()}
    if isinstance(value, dict):
        return {str(key): _serialize(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_serialize(item) for item in value]
    return value


def _diagnostics(profile: Any) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for item in getattr(profile, "diagnostics", ()) or ():
        serialized = _serialize(item)
        code = serialized.get("code") if isinstance(serialized, dict) else None
        if code:
            result[str(code)] = serialized
    return result


def _capabilities(profile: Any) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for item in getattr(profile, "capabilities", ()) or ():
        serialized = _serialize(item)
        code = serialized.get("code") if isinstance(serialized, dict) else None
        if code:
            result[str(code)] = serialized
    return result


def _telemetry_definitions(profile: Any) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for item in getattr(profile, "telemetry", ()) or ():
        serialized = _serialize(item)
        code = serialized.get("code") if isinstance(serialized, dict) else None
        if code:
            result[str(code)] = serialized
    return result


def _wifi(profile: Any, extension: dict[str, Any]) -> dict[str, Any]:
    catalog_wifi = _serialize(extension.get("wifi", {}) or {})
    result = dict(catalog_wifi)

    result.setdefault("2.4GHz", {})
    result["2.4GHz"] = {
        **result["2.4GHz"],
        "support": "SUPPORTED" if getattr(profile, "wifi24", None) else "UNSUPPORTED",
        "configuration_profile": _serialize(getattr(profile, "wifi24", None)),
    }

    result.setdefault("5GHz", {})
    result["5GHz"] = {
        **result["5GHz"],
        "support": "SUPPORTED" if getattr(profile, "wifi5", None) else "UNSUPPORTED",
        "configuration_profile": _serialize(getattr(profile, "wifi5", None)),
    }
    return result


def _runtime_firmware(extension: dict[str, Any], telemetry: dict[str, Any]) -> dict[str, Any]:
    catalog = dict(extension.get("firmware", {}) or {})
    normalized = telemetry.get("normalized", {}).get("firmware", {}) or {}
    software_version = normalized.get("software_version")
    hardware_version = normalized.get("hardware_version")

    return {
        **catalog,
        "installed_version": software_version,
        "software_version": software_version,
        "hardware_version": hardware_version,
        "status": "QUALIFIED"
        if software_version and software_version in (catalog.get("qualified_versions") or [])
        else "DISCOVERED",
        "upgrade_available": None,
    }


def _runtime_health(telemetry: dict[str, Any]) -> dict[str, Any]:
    return {
        **(telemetry.get("health", {}) or {}),
        "refresh": telemetry.get("refresh", {}) or {},
    }


def _inventory(extension: dict[str, Any]) -> dict[str, Any]:
    inventory = _serialize(extension.get("inventory", {}) or {})
    if "domains" in inventory and isinstance(inventory.get("domains"), dict):
        return inventory["domains"]
    return inventory


def build_digital_twin_contract(
    profile: Any,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    identity = _serialize(getattr(profile, "identity", None)) or {
        "model": getattr(profile, "product_class", None),
    }
    extension = resolve_digital_twin_extension(
        getattr(profile, "vendor", None),
        getattr(profile, "product_class", None),
    )
    runtime = normalize_device_telemetry(payload or {}, profile)

    hardware = _serialize(extension.get("hardware", {}) or {})
    firmware = _runtime_firmware(extension, runtime)
    telemetry = {
        "definitions": _telemetry_definitions(profile),
        "metrics": runtime.get("metrics", {}) or {},
        "normalized": runtime.get("normalized", {}) or {},
        "refresh": runtime.get("refresh", {}) or {},
    }
    health = _runtime_health(runtime)
    wifi = _wifi(profile, extension)
    diagnostics = _diagnostics(profile)
    capabilities = _capabilities(profile)
    wan = _serialize(extension.get("wan", {}) or {})
    voice = _serialize(extension.get("voice", {}) or {})
    remote_actions = _serialize(extension.get("remote_actions", {}) or {})
    procedures = _serialize(extension.get("procedures", {}) or {})
    events = _serialize(extension.get("events", {}) or {})
    inventory = _inventory(extension)

    domains = {
        "hardware": hardware,
        "firmware": firmware,
        "telemetry": telemetry,
        "health": health,
        "capabilities": capabilities,
        "wifi": wifi,
        "wan": wan,
        "voice": voice,
        "diagnostics": diagnostics,
        "remote_actions": remote_actions,
        "procedures": procedures,
        "events": events,
        "inventory": inventory,
    }

    coverage = {
        "identity": bool(identity),
        "hardware": bool(hardware),
        "firmware": bool(firmware),
        "telemetry": bool(telemetry.get("metrics")),
        "health": bool(health),
        "wifi": bool(wifi),
        "wan": bool(wan),
        "voice": bool(voice),
        "diagnostics": bool(diagnostics),
        "remote_actions": bool(remote_actions),
        "procedures": bool(procedures),
        "events": bool(events),
        "inventory": bool(inventory),
    }

    return {
        "engine": "Device Driver Digital Twin",
        "version": "EUREKA36.2.0",
        "driver": {
            "vendor": getattr(profile, "vendor", None),
            "product_class": getattr(profile, "product_class", None),
            "data_model": getattr(profile, "data_model", None),
            "refresh_root": getattr(profile, "refresh_root", None),
            "identity": identity,
            "metadata": _serialize(getattr(profile, "metadata", {})),
        },
        "domains": domains,
        "coverage": coverage,
        "identity": identity,
        "hardware": hardware,
        "firmware": firmware,
        "telemetry": telemetry,
        "health": health,
        "capabilities": capabilities,
        "wifi": wifi,
        "wan": wan,
        "voice": voice,
        "diagnostics": diagnostics,
        "remote_actions": remote_actions,
        "procedures": procedures,
        "events": events,
        "inventory": inventory,
    }

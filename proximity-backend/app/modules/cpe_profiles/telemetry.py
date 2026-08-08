from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .models import CPEProfile, TelemetryMetricProfile


def _unwrap(value: Any) -> tuple[Any, str | None]:
    if isinstance(value, dict) and "_value" in value:
        return value.get("_value"), value.get("_timestamp")
    return value, None


def _read_path(payload: dict[str, Any], path: str) -> tuple[Any, str | None]:
    current: Any = payload
    for segment in path.split("."):
        if not isinstance(current, dict) or segment not in current:
            return None, None
        current = current[segment]
    return _unwrap(current)


def _coerce(value: Any, value_type: str) -> Any:
    if value is None:
        return None
    try:
        if value_type == "integer":
            return int(float(value))
        if value_type == "number":
            return float(value)
        if value_type == "boolean":
            if isinstance(value, bool):
                return value
            return str(value).strip().lower() in {"1", "true", "yes", "on", "enabled"}
    except (TypeError, ValueError):
        return value
    return value


def _age_seconds(timestamp: str | None) -> int | None:
    if not timestamp:
        return None
    try:
        observed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        return max(0, int((datetime.now(timezone.utc) - observed).total_seconds()))
    except (TypeError, ValueError):
        return None


def _freshness_class(metric: TelemetryMetricProfile) -> str:
    return str(metric.metadata.get("freshness_class", "UNSPECIFIED"))


def extract_metric(payload: dict[str, Any], metric: TelemetryMetricProfile) -> dict[str, Any]:
    freshness_class = _freshness_class(metric)

    if metric.support == "UNSUPPORTED":
        return {
            "code": metric.code,
            "value": None,
            "unit": metric.unit,
            "status": "UNSUPPORTED",
            "support": metric.support,
            "reason": metric.reason,
            "source_path": None,
            "observed_at": None,
            "age_seconds": None,
            "freshness_class": freshness_class,
            "stale_after_seconds": metric.stale_after_seconds,
            "reliable": False,
            "needs_refresh": False,
            "refresh_root": metric.metadata.get("refresh_root"),
        }

    for path in metric.paths:
        value, timestamp = _read_path(payload, path)
        if value is None or value == "":
            continue

        age = _age_seconds(timestamp)
        status = "AVAILABLE"
        if metric.stale_after_seconds is not None and age is not None and age > metric.stale_after_seconds:
            status = "STALE"

        return {
            "code": metric.code,
            "value": _coerce(value, metric.value_type),
            "unit": metric.unit,
            "status": status,
            "support": metric.support,
            "reason": metric.reason,
            "source_path": path,
            "observed_at": timestamp,
            "age_seconds": age,
            "freshness_class": freshness_class,
            "stale_after_seconds": metric.stale_after_seconds,
            "reliable": status == "AVAILABLE",
            "needs_refresh": status == "STALE",
            "refresh_root": metric.metadata.get("refresh_root"),
        }

    return {
        "code": metric.code,
        "value": None,
        "unit": metric.unit,
        "status": "NOT_DISCOVERED",
        "support": metric.support,
        "reason": metric.reason or "No configured ACS path returned a value.",
        "source_path": None,
        "observed_at": None,
        "age_seconds": None,
        "freshness_class": freshness_class,
        "stale_after_seconds": metric.stale_after_seconds,
        "reliable": False,
        "needs_refresh": True,
        "refresh_root": metric.metadata.get("refresh_root"),
    }


def calculate_health(metrics: dict[str, dict[str, Any]]) -> dict[str, Any]:
    score = 100
    findings: list[dict[str, Any]] = []
    considered: list[str] = []
    excluded: list[str] = []

    def metric(code: str) -> dict[str, Any]:
        return metrics.get(code, {})

    for code in ("system.cpu_usage_percent", "system.memory_used_percent"):
        item = metric(code)
        if item.get("status") == "UNSUPPORTED":
            excluded.append(code)
            continue
        if item.get("status") != "AVAILABLE":
            excluded.append(code)
            continue
        considered.append(code)
        value = item.get("value")
        if value is None:
            continue
        if value >= 90:
            score -= 35
            findings.append({"severity": "CRITICAL", "code": code, "message": f"{code} critical"})
        elif value >= 75:
            score -= 20
            findings.append({"severity": "WARNING", "code": code, "message": f"{code} high"})
        elif value >= 60:
            score -= 8
            findings.append({"severity": "INFO", "code": code, "message": f"{code} elevated"})

    ppp_status = metric("wan.ppp.status")
    if ppp_status.get("status") == "AVAILABLE":
        considered.append("wan.ppp.status")
        normalized = str(ppp_status.get("value") or "").lower()
        if normalized not in {"connected", "up", "online", "active"}:
            score -= 25
            findings.append({
                "severity": "CRITICAL",
                "code": "wan.ppp.status",
                "message": f"PPP status is {ppp_status.get('value')}",
            })
    else:
        excluded.append("wan.ppp.status")

    last_error = metric("wan.ppp.last_error")
    if last_error.get("status") == "AVAILABLE":
        considered.append("wan.ppp.last_error")
        normalized = str(last_error.get("value") or "").upper()
        if normalized not in {"ERROR_NONE", "NONE", "NO_ERROR", ""}:
            score -= 15
            findings.append({
                "severity": "WARNING",
                "code": "wan.ppp.last_error",
                "message": f"PPP last error is {last_error.get('value')}",
            })
    else:
        excluded.append("wan.ppp.last_error")

    score = max(0, score)
    if score < 50:
        status = "CRITICAL"
        risk = "HIGH"
    elif score < 75:
        status = "WARNING"
        risk = "MEDIUM"
    else:
        status = "GOOD"
        risk = "LOW"

    return {
        "score": score,
        "status": status,
        "risk_level": risk,
        "considered_metrics": considered,
        "excluded_metrics": excluded,
        "findings": findings,
        "confidence": "HIGH" if len(considered) >= 2 else "LIMITED",
    }


def normalize_device_telemetry(payload: dict[str, Any], profile: CPEProfile) -> dict[str, Any]:
    metrics = {metric.code: extract_metric(payload, metric) for metric in profile.telemetry}
    capabilities = {
        item.code: {
            "support": item.support,
            "reason": item.reason,
            "qualification": item.qualification,
            "metadata": item.metadata,
        }
        for item in profile.capabilities
    }
    health = calculate_health(metrics)
    refresh_roots = sorted({
        item.get("refresh_root")
        for item in metrics.values()
        if item.get("needs_refresh") and item.get("refresh_root")
    })

    return {
        "engine": "Device Driver Engine",
        "version": "EUREKA35.0.1",
        "driver": {
            "vendor": profile.vendor,
            "product_class": profile.product_class,
            "data_model": profile.data_model,
            "identity": {
                "model": profile.identity.model if profile.identity else profile.product_class,
                "family": profile.identity.family if profile.identity else None,
                "category": profile.identity.category if profile.identity else None,
                "description": profile.identity.description if profile.identity else None,
                "image": profile.identity.image if profile.identity else None,
                "vendor_logo": profile.identity.vendor_logo if profile.identity else None,
            },
            "metadata": profile.metadata,
        },
        "metrics": metrics,
        "capabilities": capabilities,
        "health": health,
        "refresh": {
            "required": bool(refresh_roots),
            "object_names": refresh_roots,
        },
        "normalized": {
            "system": {
                "uptime_seconds": metrics.get("system.uptime_seconds", {}).get("value"),
                "uptime_status": metrics.get("system.uptime_seconds", {}).get("status"),
                "cpu_usage_percent": metrics.get("system.cpu_usage_percent", {}).get("value"),
                "cpu_status": metrics.get("system.cpu_usage_percent", {}).get("status"),
                "memory_free_percent": metrics.get("system.memory_free_percent", {}).get("value"),
                "memory_used_percent": metrics.get("system.memory_used_percent", {}).get("value"),
                "memory_status": metrics.get("system.memory_used_percent", {}).get("status"),
            },
            "wan": {
                "ppp": {
                    "status": metrics.get("wan.ppp.status", {}).get("value"),
                    "status_state": metrics.get("wan.ppp.status", {}).get("status"),
                    "ip_address": metrics.get("wan.ppp.ip_address", {}).get("value"),
                    "ip_address_state": metrics.get("wan.ppp.ip_address", {}).get("status"),
                    "gateway": metrics.get("wan.ppp.gateway", {}).get("value"),
                    "username": metrics.get("wan.ppp.username", {}).get("value"),
                    "uptime_seconds": metrics.get("wan.ppp.uptime_seconds", {}).get("value"),
                    "uptime_status": metrics.get("wan.ppp.uptime_seconds", {}).get("status"),
                    "last_error": metrics.get("wan.ppp.last_error", {}).get("value"),
                    "service_name": metrics.get("wan.ppp.service_name", {}).get("value"),
                    "dns_servers": metrics.get("wan.ppp.dns_servers", {}).get("value"),
                    "vlan": metrics.get("wan.ppp.vlan", {}).get("value"),
                },
            },
            "firmware": {
                "software_version": metrics.get("firmware.software_version", {}).get("value"),
                "hardware_version": metrics.get("firmware.hardware_version", {}).get("value"),
            },
        },
    }

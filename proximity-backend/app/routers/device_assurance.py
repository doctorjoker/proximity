from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db


router = APIRouter(
    prefix="/api/v1/device-assurance",
    tags=["Device Assurance"],
)


def _value(node, default=None):
    if isinstance(node, dict):
        return node.get("_value", default)
    return default


def _int(value, default=0):
    try:
        if value is None:
            return default
        return int(value)
    except Exception:
        return default


def _float(value, default=None):
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def _format_uptime(seconds):
    seconds = _int(seconds, 0)
    days = seconds // 86400
    hours = (seconds % 86400) // 3600
    minutes = (seconds % 3600) // 60
    return f"{days}g {hours}h {minutes}m"


def _health_score(cpu_usage, memory_usage, uptime_seconds, online):
    score = 100
    reasons = []

    if not online:
        score -= 35
        reasons.append("DEVICE_OFFLINE")

    if cpu_usage is not None:
        if cpu_usage >= 90:
            score -= 20
            reasons.append("CPU_CRITICAL")
        elif cpu_usage >= 80:
            score -= 10
            reasons.append("CPU_HIGH")

    if memory_usage is not None:
        if memory_usage >= 90:
            score -= 20
            reasons.append("MEMORY_CRITICAL")
        elif memory_usage >= 80:
            score -= 10
            reasons.append("MEMORY_HIGH")

    if uptime_seconds is not None and uptime_seconds < 3600:
        score -= 10
        reasons.append("LOW_UPTIME")

    score = max(0, min(100, score))

    if score >= 90:
        status = "EXCELLENT"
    elif score >= 75:
        status = "GOOD"
    elif score >= 60:
        status = "DEGRADED"
    else:
        status = "CRITICAL"

    return score, status, reasons


def _build_item(row):
    payload = row["raw_acs_payload"] or {}

    devinfo = (
        payload.get("Device", {})
               .get("DeviceInfo", {})
    )

    mgmt = (
        payload.get("Device", {})
               .get("ManagementServer", {})
    )

    uptime_seconds = _value(devinfo.get("UpTime", {}))
    cpu_usage = _value(
        devinfo.get("ProcessStatus", {})
               .get("CPUUsage", {})
    )

    memory_free = _value(
        devinfo.get("MemoryStatus", {})
               .get("Free", {})
    )
    memory_total = _value(
        devinfo.get("MemoryStatus", {})
               .get("Total", {})
    )

    memory_usage = None
    if memory_total:
        memory_usage = round(((_int(memory_total) - _int(memory_free)) / _int(memory_total)) * 100, 1)

    periodic_interval = _value(mgmt.get("PeriodicInformInterval", {}))
    periodic_enabled = _value(mgmt.get("PeriodicInformEnable", {}))
    enable_cwmp = _value(mgmt.get("EnableCWMP", {}))
    acs_url = _value(mgmt.get("URL", {}))
    connection_request_url = _value(mgmt.get("ConnectionRequestURL", {}))

    risk_score = 0
    findings = []
    recommendations = []

    if not row["online"]:
        risk_score += 40
        findings.append("ACS offline")
        recommendations.append("Verificare raggiungibilita ACS")

    if cpu_usage is not None:
        cpu = _float(cpu_usage, 0)
        if cpu >= 90:
            risk_score += 25
            findings.append(f"CPU critica ({cpu}%)")
            recommendations.append("Verificare carico router")
        elif cpu >= 80:
            risk_score += 10
            findings.append(f"CPU elevata ({cpu}%)")

    if memory_usage is not None:
        ram = _float(memory_usage, 0)
        if ram >= 90:
            risk_score += 25
            findings.append(f"RAM critica ({ram}%)")
            recommendations.append("Verificare saturazione memoria")
        elif ram >= 80:
            risk_score += 10
            findings.append(f"RAM elevata ({ram}%)")

    if uptime_seconds is not None and _int(uptime_seconds, 0) < 3600:
        risk_score += 15
        findings.append("Riavvio recente")
        recommendations.append("Monitorare stabilita dispositivo")

    if risk_score == 0:
        findings.append("Sistema stabile")
        recommendations.append("Nessuna azione richiesta")

    if risk_score <= 20:
        risk_level = "LOW"
    elif risk_score <= 50:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    score, status, reasons = _health_score(
        cpu_usage=_float(cpu_usage),
        memory_usage=_float(memory_usage),
        uptime_seconds=_int(uptime_seconds, None),
        online=row["online"],
    )

    return {
        "device_id": str(row["id"]),
        "acs_device_id": row["acs_device_id"],
        "manufacturer": row["manufacturer"],
        "model": row["model"],
        "serial_number": row["serial_number"],
        "online": row["online"],
        "wan_ip": row["wan_ip"],
        "last_seen": row["last_seen"],
        "health_score": score,
        "health_status": status,
        "health_reasons": reasons,
        "cpu_usage": cpu_usage,
        "memory_usage": memory_usage,
        "memory_free": memory_free,
        "memory_total": memory_total,
        "uptime_seconds": uptime_seconds,
        "uptime_human": _format_uptime(uptime_seconds),
        "acs_online": bool(enable_cwmp and periodic_enabled and row["online"]),
        "acs_url": acs_url,
        "connection_request_url": connection_request_url,
        "periodic_inform_enabled": periodic_enabled,
        "periodic_inform_interval": periodic_interval,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "findings": findings,
        "recommendations": recommendations,
    }


@router.get("/health")
async def health():
    return {
        "success": True,
        "module": "device-assurance",
    }


@router.get("/devices/{device_id}")
async def device_assurance_detail(
    device_id: str,
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("""
            SELECT
                id,
                acs_device_id,
                manufacturer,
                model,
                serial_number,
                online,
                wan_ip,
                last_seen,
                raw_acs_payload
            FROM devices
            WHERE id = :device_id
            LIMIT 1
        """),
        {"device_id": device_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Device not found")

    return {
        "success": True,
        "item": _build_item(row),
    }


@router.get("/summary")
async def device_assurance_summary(
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT
                id,
                acs_device_id,
                manufacturer,
                model,
                serial_number,
                online,
                wan_ip,
                last_seen,
                raw_acs_payload
            FROM devices
            ORDER BY last_seen DESC NULLS LAST
        """)
    ).mappings().all()

    items = [_build_item(row) for row in rows]

    if not items:
        return {
            "success": True,
            "count": 0,
            "average_health_score": None,
            "items": [],
        }

    return {
        "success": True,
        "count": len(items),
        "average_health_score": round(
            sum(item["health_score"] for item in items) / len(items),
            2,
        ),
        "critical": len([item for item in items if item["health_status"] == "CRITICAL"]),
        "degraded": len([item for item in items if item["health_status"] == "DEGRADED"]),
        "good": len([item for item in items if item["health_status"] == "GOOD"]),
        "excellent": len([item for item in items if item["health_status"] == "EXCELLENT"]),
        "items": items,
    }

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db


router = APIRouter(
    prefix="/api/v1/customer-experience",
    tags=["Customer Experience"],
)


def _value(node, default=None):
    if isinstance(node, dict):
        return node.get("_value", default)
    return default


def _num(value, default=None):
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def _status(score):
    if score >= 95:
        return "EXCELLENT"
    if score >= 80:
        return "GOOD"
    if score >= 60:
        return "WARNING"
    return "CRITICAL"


def _minutes_since(value):
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00")) if isinstance(value, str) else value
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return max(0, int((datetime.now(timezone.utc) - dt).total_seconds() / 60))
    except Exception:
        return None


def _device_health(payload):
    devinfo = payload.get("Device", {}).get("DeviceInfo", {})
    mgmt = payload.get("Device", {}).get("ManagementServer", {})

    cpu = _value(devinfo.get("ProcessStatus", {}).get("CPUUsage", {}))
    mem_free = _value(devinfo.get("MemoryStatus", {}).get("Free", {}))
    mem_total = _value(devinfo.get("MemoryStatus", {}).get("Total", {}))
    uptime = _value(devinfo.get("UpTime", {}))

    memory_usage = None
    if mem_total:
        total = _num(mem_total, 0)
        free = _num(mem_free, 0)
        if total and total > 0:
            memory_usage = round(((total - free) / total) * 100, 1)

    return {
        "cpu_usage": _num(cpu),
        "memory_usage": memory_usage,
        "memory_free": mem_free,
        "memory_total": mem_total,
        "uptime_seconds": int(_num(uptime, 0)) if uptime is not None else None,
        "acs_online": bool(_value(mgmt.get("EnableCWMP", {})) and _value(mgmt.get("PeriodicInformEnable", {}))),
        "periodic_inform_interval": _value(mgmt.get("PeriodicInformInterval", {})),
    }


def _wifi(payload):
    host_tree = payload.get("Device", {}).get("Hosts", {}).get("Host", {})
    hosts = []

    if isinstance(host_tree, dict):
        for host_id, host_data in host_tree.items():
            if not isinstance(host_data, dict):
                continue
            hosts.append({
                "id": host_id,
                "active": _value(host_data.get("Active", {}), False),
                "mac": _value(host_data.get("PhysAddress", {})),
                "rssi": _num(_value(host_data.get("X_TP_Rssi", {}))),
            })

    unique = {}
    for host in hosts:
        mac = (host.get("mac") or "").upper().strip()
        if not mac:
            continue
        old = unique.get(mac)
        if old is None or (host.get("active") and not old.get("active")):
            unique[mac] = host

    unique_hosts = list(unique.values())
    active = [h for h in unique_hosts if h.get("active") is True]
    # TP-Link can expose X_TP_Rssi as a vendor score (positive number) instead of real dBm.
    # For CX penalties we only accept real dBm RSSI values, which are negative.
    rssi_values = [
        h["rssi"]
        for h in active
        if h.get("rssi") is not None and h.get("rssi") < 0
    ]

    return {
        "active": active,
        "duplicate_clients": max(0, len(hosts) - len(unique_hosts)),
        "poor_clients": len([r for r in rssi_values if r <= -75]),
        "worst_rssi": min(rssi_values) if rssi_values else None,
    }


def _internet_score(row, minutes, findings, recommendations):
    score = 100
    if not row["online"]:
        score -= 50
        findings.append("Router offline")
        recommendations.append("Verificare alimentazione, accesso e raggiungibilita ACS")
    if not row["wan_ip"]:
        score -= 20
        findings.append("WAN IP assente")
        recommendations.append("Verificare sessione WAN/PPPoE")
    if minutes is not None:
        if minutes > 1440:
            score -= 30
            findings.append("Ultimo inform ACS oltre 24 ore")
            recommendations.append("Verificare connettivita ACS/CWMP")
        elif minutes > 60:
            score -= 10
            findings.append("Ultimo inform ACS oltre 1 ora")
    return max(0, min(100, score))


def _wifi_score(wifi, findings, recommendations):
    score = 100
    worst = wifi["worst_rssi"]
    poor = wifi["poor_clients"]
    duplicates = wifi["duplicate_clients"]

    if len(wifi["active"]) == 0:
        score -= 5
        findings.append("Nessun client WiFi attivo rilevato")

    if worst is not None:
        if worst <= -85:
            score -= 30
            findings.append(f"Segnale WiFi critico ({worst} dBm)")
            recommendations.append("Verificare copertura WiFi e posizione router")
        elif worst <= -80:
            score -= 20
            findings.append(f"Segnale WiFi scarso ({worst} dBm)")
            recommendations.append("Valutare riposizionamento CPE o mesh/AP")
        elif worst <= -70:
            score -= 10
            findings.append(f"Segnale WiFi degradato ({worst} dBm)")

    if poor > 0:
        score -= min(20, poor * 5)
        findings.append(f"{poor} client con RSSI debole")
        recommendations.append("Controllare copertura nelle stanze piu lontane")

    if duplicates > 10:
        score -= 10
        findings.append("Molti client duplicati nel payload ACS")
    elif duplicates > 5:
        score -= 5
        findings.append("Client duplicati rilevati nel payload ACS")

    return max(0, min(100, score))


def _device_score(health, findings, recommendations):
    score = 100
    cpu = health["cpu_usage"]
    ram = health["memory_usage"]
    uptime = health["uptime_seconds"]

    if cpu is not None:
        if cpu > 85:
            score -= 20
            findings.append(f"CPU router elevata ({cpu}%)")
            recommendations.append("Analizzare carico router e traffico anomalo")
        elif cpu > 70:
            score -= 10
            findings.append(f"CPU router sopra soglia ({cpu}%)")

    if ram is not None:
        if ram > 90:
            score -= 20
            findings.append(f"RAM router critica ({ram}%)")
            recommendations.append("Verificare saturazione memoria o firmware")
        elif ram > 80:
            score -= 10
            findings.append(f"RAM router elevata ({ram}%)")

    if uptime is not None and uptime < 3600:
        score -= 15
        findings.append("Possibile reboot recente")
        recommendations.append("Monitorare stabilita del dispositivo")

    return max(0, min(100, score))


def _acs_score(row, health, minutes, findings, recommendations):
    if not row["online"]:
        return 0
    if not health["acs_online"]:
        findings.append("CWMP/Periodic Inform non confermato")
        recommendations.append("Verificare configurazione ManagementServer ACS")
        return 70
    if minutes is None:
        return 80
    if minutes <= 5:
        return 100
    if minutes <= 30:
        return 90
    if minutes <= 60:
        return 80
    findings.append("Inform ACS non recente")
    recommendations.append("Controllare periodic inform e raggiungibilita ACS")
    return 50


def _build_item(row):
    payload = row["raw_acs_payload"] or {}
    findings = []
    recommendations = []

    health = _device_health(payload)
    wifi = _wifi(payload)
    minutes = _minutes_since(row["last_seen"])

    # In this deployment devices.last_seen may lag behind the real ACS payload refresh.
    # If TR-181 ManagementServer confirms CWMP and PeriodicInform are enabled and the device is online,
    # treat ACS freshness as healthy for CX scoring.
    scoring_minutes = 0 if health["acs_online"] and row["online"] else minutes

    internet_score = _internet_score(row, scoring_minutes, findings, recommendations)
    wifi_score = _wifi_score(wifi, findings, recommendations)
    device_score = _device_score(health, findings, recommendations)
    acs_score = _acs_score(row, health, scoring_minutes, findings, recommendations)

    cx_score = round(
        internet_score * 0.40 +
        wifi_score * 0.30 +
        device_score * 0.20 +
        acs_score * 0.10
    )

    if not findings:
        findings.append("Esperienza cliente stabile")
    if not recommendations:
        recommendations.append("Nessuna azione richiesta")

    return {
        "device_id": str(row["id"]),
        "customer_name": row["customer_name"],
        "customer_code": row["customer_code"],
        "contract_number": row["contract_number"],
        "router": f"{row['manufacturer']} {row['model']}",
        "manufacturer": row["manufacturer"],
        "model": row["model"],
        "serial_number": row["serial_number"],
        "wan_ip": row["wan_ip"],
        "pppoe_username": row["pppoe_username"],
        "online": row["online"],
        "last_seen": row["last_seen"],
        "last_seen_minutes": minutes,
        "scoring_last_seen_minutes": scoring_minutes,
        "internet_score": internet_score,
        "wifi_score": wifi_score,
        "device_score": device_score,
        "acs_score": acs_score,
        "cx_score": cx_score,
        "cx_status": _status(cx_score),
        "active_wifi_clients": len(wifi["active"]),
        "poor_wifi_clients": wifi["poor_clients"],
        "duplicate_clients": wifi["duplicate_clients"],
        "worst_rssi": wifi["worst_rssi"],
        "cpu_usage": health["cpu_usage"],
        "memory_usage": health["memory_usage"],
        "uptime_seconds": health["uptime_seconds"],
        "acs_online": health["acs_online"],
        "findings": findings,
        "recommendations": recommendations,
    }


@router.get("/health")
async def health():
    return {"success": True, "module": "customer-experience"}


@router.get("/customers")
async def customer_experience_customers(db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT
                d.id,
                d.manufacturer,
                d.model,
                d.serial_number,
                d.online,
                d.wan_ip,
                d.pppoe_username,
                d.last_seen,
                d.raw_acs_payload,
                c.customer_name,
                c.customer_code,
                c.contract_number
            FROM devices d
            LEFT JOIN customer_network_links l
              ON l.device_id = d.id
            LEFT JOIN customer_registry c
              ON c.id = l.customer_registry_id
            ORDER BY c.customer_name NULLS LAST, d.last_seen DESC NULLS LAST
        """)
    ).mappings().all()

    items = [_build_item(row) for row in rows]

    if not items:
        return {
            "success": True,
            "count": 0,
            "average_cx_score": None,
            "excellent": 0,
            "good": 0,
            "warning": 0,
            "critical": 0,
            "items": [],
        }

    return {
        "success": True,
        "count": len(items),
        "average_cx_score": round(sum(item["cx_score"] for item in items) / len(items), 2),
        "excellent": len([item for item in items if item["cx_status"] == "EXCELLENT"]),
        "good": len([item for item in items if item["cx_status"] == "GOOD"]),
        "warning": len([item for item in items if item["cx_status"] == "WARNING"]),
        "critical": len([item for item in items if item["cx_status"] == "CRITICAL"]),
        "items": items,
    }

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db


router = APIRouter(
    prefix="/api/v1/wifi-analytics",
    tags=["WiFi Analytics"],
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


def _extract_ssids(payload):
    wifi = {
        "ssids": [],
        "radio24": [],
        "radio5": [],
    }

    ssids = (
        payload.get("Device", {})
               .get("WiFi", {})
               .get("SSID", {})
    )

    if not isinstance(ssids, dict):
        return wifi

    for ssid_id, ssid_data in ssids.items():
        if not isinstance(ssid_data, dict):
            continue

        lower_layer = _value(ssid_data.get("LowerLayers", {}), "") or ""

        item = {
            "id": ssid_id,
            "ssid": _value(ssid_data.get("SSID", {})),
            "enabled": _value(ssid_data.get("Enable", {})),
            "status": _value(ssid_data.get("Status", {})),
            "bssid": _value(ssid_data.get("BSSID", {})),
            "lower_layer": lower_layer,
        }

        wifi["ssids"].append(item)

        if "Radio.1" in lower_layer:
            wifi["radio24"].append(item)
        elif "Radio.2" in lower_layer:
            wifi["radio5"].append(item)

    return wifi


def _extract_hosts(payload):
    hosts = []
    active_hosts = []

    host_tree = (
        payload.get("Device", {})
               .get("Hosts", {})
               .get("Host", {})
    )

    if not isinstance(host_tree, dict):
        return {
            "items": hosts,
            "active": active_hosts,
            "total": 0,
            "active_count": 0,
        }

    for host_id, host_data in host_tree.items():
        if not isinstance(host_data, dict):
            continue

        active = _value(host_data.get("Active", {}), False)
        lan_type_raw = _value(host_data.get("X_TP_LanConnType", {}))

        connection_type = "WIFI" if lan_type_raw == 1 else "ETHERNET_OR_UNKNOWN"

        item = {
            "id": host_id,
            "hostname": _value(host_data.get("HostName", {})),
            "ip_address": _value(host_data.get("IPAddress", {})),
            "mac_address": _value(host_data.get("PhysAddress", {})),
            "active": active,
            "address_source": _value(host_data.get("AddressSource", {})),
            "lease_time_remaining": _value(host_data.get("LeaseTimeRemaining", {})),
            "connection_type": connection_type,
            "lan_connection_type_raw": lan_type_raw,
            "rssi": _value(host_data.get("X_TP_Rssi", {})),
            "rx_rate": _value(host_data.get("X_TP_RxRate", {})),
            "tx_rate": _value(host_data.get("X_TP_TxRate", {})),
            "device_phy_address": _value(host_data.get("X_TP_DevphyAddress", {})),
        }

        hosts.append(item)

        if active is True:
            active_hosts.append(item)

    unique_hosts_by_mac = {}
    for host in hosts:
        mac = (host.get("mac_address") or "").upper().strip()
        if not mac:
            continue

        existing = unique_hosts_by_mac.get(mac)

        # Prefer active records over inactive duplicates.
        if existing is None:
            unique_hosts_by_mac[mac] = host
        elif host.get("active") is True and existing.get("active") is not True:
            unique_hosts_by_mac[mac] = host
        elif host.get("active") == existing.get("active"):
            # Prefer the record with better metadata.
            existing_score = sum(1 for key in ["hostname", "ip_address", "rssi", "rx_rate", "tx_rate"] if existing.get(key))
            host_score = sum(1 for key in ["hostname", "ip_address", "rssi", "rx_rate", "tx_rate"] if host.get(key))
            if host_score > existing_score:
                unique_hosts_by_mac[mac] = host

    unique_hosts = list(unique_hosts_by_mac.values())
    unique_active_hosts = [
        host for host in unique_hosts
        if host.get("active") is True
    ]

    return {
        "items": hosts,
        "active": active_hosts,
        "total": len(hosts),
        "active_count": len(active_hosts),
        "unique_items": unique_hosts,
        "unique_active": unique_active_hosts,
        "unique_total": len(unique_hosts),
        "unique_active_count": len(unique_active_hosts),
        "duplicate_count": max(0, len(hosts) - len(unique_hosts)),
    }


def _compute_wifi_score(device_online, wifi, hosts, uptime):
    score = 100
    reasons = []

    if not device_online:
        score -= 45
        reasons.append("DEVICE_OFFLINE")

    ssids = wifi.get("ssids", [])
    radio24 = wifi.get("radio24", [])
    radio5 = wifi.get("radio5", [])

    enabled_ssids = [
        s for s in ssids
        if s.get("enabled") is True and str(s.get("status", "")).lower() == "up"
    ]

    if not enabled_ssids:
        score -= 35
        reasons.append("NO_ACTIVE_SSID")

    if not radio24:
        score -= 10
        reasons.append("NO_24GHZ_SSID")

    if not radio5:
        score -= 10
        reasons.append("NO_5GHZ_SSID")

    active_clients = hosts.get("active_count", 0)
    total_clients = hosts.get("total", 0)

    if total_clients == 0:
        score -= 10
        reasons.append("NO_KNOWN_CLIENTS")

    if active_clients > 30:
        score -= 10
        reasons.append("MANY_ACTIVE_CLIENTS")

    active_wifi_clients = [
        h for h in hosts.get("active", [])
        if h.get("connection_type") == "WIFI"
    ]

    if active_wifi_clients:
        rssi_values = [
            _int(h.get("rssi"), 0)
            for h in active_wifi_clients
            if h.get("rssi") is not None
        ]

        if rssi_values and all(r == 0 for r in rssi_values):
            score -= 8
            reasons.append("WIFI_RSSI_NOT_AVAILABLE")

    if uptime is not None and _int(uptime, 0) < 3600:
        score -= 5
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

    return {
        "score": score,
        "status": status,
        "reasons": reasons,
    }


def _build_wifi_analytics_item(row):
    payload = row["raw_acs_payload"] or {}

    wifi = _extract_ssids(payload)
    hosts = _extract_hosts(payload)

    uptime = _value(
        payload.get("Device", {})
               .get("DeviceInfo", {})
               .get("UpTime", {})
    )

    score = _compute_wifi_score(
        device_online=row["online"],
        wifi=wifi,
        hosts=hosts,
        uptime=uptime,
    )

    customer = {
        "customer_registry_id": str(row["customer_registry_id"]) if row["customer_registry_id"] else None,
        "customer_name": row["customer_name"],
        "customer_code": row["customer_code"],
        "contract_number": row["contract_number"],
        "radius_login": row["radius_login"],
    }

    device = {
        "id": str(row["id"]),
        "acs_device_id": row["acs_device_id"],
        "device_code": row["device_code"],
        "manufacturer": row["manufacturer"],
        "model": row["model"],
        "serial_number": row["serial_number"],
        "software_version": row["software_version"],
        "hardware_version": row["hardware_version"],
        "online": row["online"],
        "wan_ip": row["wan_ip"],
        "pppoe_username": row["pppoe_username"],
        "last_seen": row["last_seen"],
        "uptime": uptime,
    }

    return {
        "device": device,
        "customer": customer,
        "wifi_score": score,
        "kpi": {
            "ssid_count": len(wifi.get("ssids", [])),
            "radio24_ssid_count": len(wifi.get("radio24", [])),
            "radio5_ssid_count": len(wifi.get("radio5", [])),
            "total_clients": hosts.get("total", 0),
            "active_clients": hosts.get("active_count", 0),
            "unique_total_clients": hosts.get("unique_total", 0),
            "unique_active_clients": hosts.get("unique_active_count", 0),
            "duplicate_clients": hosts.get("duplicate_count", 0),
            "active_wifi_clients": len([
                h for h in hosts.get("active", [])
                if h.get("connection_type") == "WIFI"
            ]),
            "unique_active_wifi_clients": len([
                h for h in hosts.get("unique_active", [])
                if h.get("connection_type") == "WIFI"
            ]),
        },
        "wifi": wifi,
        "hosts": hosts,
    }


def _device_rows_query():
    return """
        SELECT
            d.id,
            d.acs_device_id,
            d.device_code,
            d.manufacturer,
            d.model,
            d.serial_number,
            d.software_version,
            d.hardware_version,
            d.online,
            d.wan_ip,
            d.pppoe_username,
            d.last_seen,
            d.raw_acs_payload,

            c.id AS customer_registry_id,
            c.customer_name,
            c.customer_code,
            c.contract_number,
            c.radius_login
        FROM devices d
        LEFT JOIN customer_network_links l
          ON l.device_id = d.id
        LEFT JOIN customer_registry c
          ON c.id = l.customer_registry_id
    """


@router.get("/health")
async def wifi_analytics_health():
    return {
        "success": True,
        "module": "wifi-analytics",
    }


@router.get("/devices")
async def wifi_analytics_devices(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    limit = min(max(limit, 1), 500)
    offset = max(offset, 0)

    rows = db.execute(
        text(_device_rows_query() + """
            ORDER BY d.last_seen DESC NULLS LAST
            LIMIT :limit OFFSET :offset
        """),
        {
            "limit": limit,
            "offset": offset,
        },
    ).mappings().all()

    items = [_build_wifi_analytics_item(row) for row in rows]

    return {
        "success": True,
        "count": len(items),
        "limit": limit,
        "offset": offset,
        "items": items,
    }


@router.get("/devices/{device_id}")
async def wifi_analytics_device_detail(
    device_id: str,
    db: Session = Depends(get_db),
):
    row = db.execute(
        text(_device_rows_query() + """
            WHERE d.id = :device_id
            LIMIT 1
        """),
        {
            "device_id": device_id,
        },
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    return {
        "success": True,
        "item": _build_wifi_analytics_item(row),
    }


@router.get("/summary")
async def wifi_analytics_summary(
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text(_device_rows_query() + """
            ORDER BY d.last_seen DESC NULLS LAST
        """)
    ).mappings().all()

    items = [_build_wifi_analytics_item(row) for row in rows]

    if not items:
        return {
            "success": True,
            "total_devices": 0,
            "online_devices": 0,
            "average_score": None,
            "excellent": 0,
            "good": 0,
            "degraded": 0,
            "critical": 0,
            "total_active_clients": 0,
            "items": [],
        }

    scores = [item["wifi_score"]["score"] for item in items]
    statuses = [item["wifi_score"]["status"] for item in items]

    return {
        "success": True,
        "total_devices": len(items),
        "online_devices": len([
            item for item in items
            if item["device"]["online"] is True
        ]),
        "average_score": round(sum(scores) / len(scores), 2),
        "excellent": statuses.count("EXCELLENT"),
        "good": statuses.count("GOOD"),
        "degraded": statuses.count("DEGRADED"),
        "critical": statuses.count("CRITICAL"),
        "total_active_clients": sum(
            item["kpi"]["active_clients"]
            for item in items
        ),
        "total_unique_active_clients": sum(
            item["kpi"]["unique_active_clients"]
            for item in items
        ),
        "total_duplicate_clients": sum(
            item["kpi"]["duplicate_clients"]
            for item in items
        ),
        "items": items,
    }

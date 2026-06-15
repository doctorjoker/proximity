from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
import json
import re

from app.db.session import get_db


router = APIRouter(
    prefix="/api/v1/home-network",
    tags=["Home Network Intelligence"],
)


def _value(node, default=None):
    if isinstance(node, dict):
        return node.get("_value", default)
    return default


def _walk_dicts(tree):
    if isinstance(tree, dict):
        yield tree
        for value in tree.values():
            yield from _walk_dicts(value)
    elif isinstance(tree, list):
        for value in tree:
            yield from _walk_dicts(value)


def _safe_int(value):
    try:
        if value in (None, ""):
            return None
        return int(float(value))
    except Exception:
        return None


def _signal_quality(rssi):
    """
    Supporta due formati TP-Link/ACS:
    - RSSI reale in dBm negativo: -45 ottimo, -80 scarso.
    - SignalStrength positivo legacy/vendor: 0-40 ottimo, 75+ scarso.
    """
    rssi = _safe_int(rssi)
    if rssi is None:
        return "UNKNOWN"

    # RSSI reale in dBm.
    if rssi < 0:
        if rssi >= -55:
            return "EXCELLENT"
        if rssi >= -67:
            return "GOOD"
        if rssi >= -75:
            return "FAIR"
        return "POOR"

    # SignalStrength positivo vendor/legacy.
    if rssi <= 40:
        return "EXCELLENT"
    if rssi <= 60:
        return "GOOD"
    if rssi <= 75:
        return "FAIR"
    return "POOR"


def _quality_score(quality):
    if quality == "EXCELLENT":
        return 100
    if quality == "GOOD":
        return 85
    if quality == "FAIR":
        return 65
    if quality == "POOR":
        return 40
    return 75


def _band_from_path_or_value(path, lower_layers=None, ssid=None):
    text_blob = " ".join([str(path or ""), str(lower_layers or ""), str(ssid or "")]).lower()
    if "radio.2" in text_blob or "5g" in text_blob or "5ghz" in text_blob:
        return "5GHz"
    if "radio.1" in text_blob or "2.4" in text_blob or "2g" in text_blob:
        return "2.4GHz"
    return "UNKNOWN"


def _vendor_from_mac(mac):
    if not mac:
        return None

    prefix = mac.upper().replace("-", ":")[:8]
    vendors = {
        "A0:FB:C5": "Apple",
        "D2:3C:DC": "OPPO",
        "B4:FB:E3": "Unknown",
        "22:BF:CE": "Unknown",
        "E8:48:B8": "TP-Link",
        "A8:42:A1": "TP-Link",
    }
    return vendors.get(prefix)


def _extract_ssid_map(payload):
    ssids = {}
    wifi = payload.get("Device", {}).get("WiFi", {})
    ssid_tree = wifi.get("SSID", {})

    if isinstance(ssid_tree, dict):
        for ssid_id, ssid_data in ssid_tree.items():
            if not isinstance(ssid_data, dict):
                continue

            ssids[f"Device.WiFi.SSID.{ssid_id}."] = {
                "ssid_id": str(ssid_id),
                "ssid": _value(ssid_data.get("SSID", {})),
                "bssid": _value(ssid_data.get("BSSID", {})),
                "lower_layers": _value(ssid_data.get("LowerLayers", {})),
                "status": _value(ssid_data.get("Status", {})),
                "enabled": _value(ssid_data.get("Enable", {})),
                "band": _band_from_path_or_value(
                    path=f"Device.WiFi.SSID.{ssid_id}.",
                    lower_layers=_value(ssid_data.get("LowerLayers", {})),
                    ssid=_value(ssid_data.get("SSID", {})),
                ),
            }

    return ssids


def _extract_hosts(payload):
    hosts = []

    # TR-181 classico: Device.Hosts.Host.{i}
    host_tree = (
        payload.get("Device", {})
               .get("Hosts", {})
               .get("Host", {})
    )

    if isinstance(host_tree, dict):
        for host_id, host in host_tree.items():
            if not isinstance(host, dict):
                continue

            mac = _value(host.get("PhysAddress", {})) or _value(host.get("MACAddress", {}))
            ip = _value(host.get("IPAddress", {})) or _value(host.get("IPv4Address", {}))
            hostname = _value(host.get("HostName", {})) or _value(host.get("Hostname", {})) or _value(host.get("Name", {}))
            active = _value(host.get("Active", {}))
            layer1 = _value(host.get("Layer1Interface", {}))
            layer3 = _value(host.get("Layer3Interface", {}))

            hosts.append({
                "source": "Device.Hosts.Host",
                "host_id": str(host_id),
                "hostname": hostname or "Unknown",
                "ip_address": ip,
                "mac_address": mac,
                "active": bool(active) if active is not None else None,
                "interface": layer1 or layer3,
                "band": _band_from_path_or_value(layer1 or layer3),
                "rssi": _safe_int(_value(host.get("SignalStrength", {})) or _value(host.get("RSSI", {}))),
                "rx_rate": _safe_int(_value(host.get("RxRate", {})) or _value(host.get("RXRate", {}))),
                "tx_rate": _safe_int(_value(host.get("TxRate", {})) or _value(host.get("TXRate", {}))),
                "vendor": _vendor_from_mac(mac),
            })

    return hosts


def _extract_associated_devices(payload, ssid_map):
    clients = []

    wifi = payload.get("Device", {}).get("WiFi", {})
    ap_tree = wifi.get("AccessPoint", {})

    if not isinstance(ap_tree, dict):
        return clients

    for ap_id, ap in ap_tree.items():
        if not isinstance(ap, dict):
            continue

        ssid_reference = _value(ap.get("SSIDReference", {}))
        ssid_info = ssid_map.get(ssid_reference, {})
        assoc_tree = ap.get("AssociatedDevice", {})

        if not isinstance(assoc_tree, dict):
            continue

        for client_id, client in assoc_tree.items():
            if not isinstance(client, dict):
                continue

            mac = (
                _value(client.get("MACAddress", {}))
                or _value(client.get("AssociatedDeviceMACAddress", {}))
                or _value(client.get("PhysAddress", {}))
            )
            ip = (
                _value(client.get("IPAddress", {}))
                or _value(client.get("IPv4Address", {}))
                or _value(client.get("X_TP_IPAddress", {}))
            )
            hostname = (
                _value(client.get("HostName", {}))
                or _value(client.get("Hostname", {}))
                or _value(client.get("Name", {}))
                or _value(client.get("X_TP_HostName", {}))
                or "Unknown"
            )
            active = _value(client.get("Active", {}))
            rssi = (
                _value(client.get("SignalStrength", {}))
                or _value(client.get("RSSI", {}))
                or _value(client.get("X_TP_RSSI", {}))
            )

            rx_rate = (
                _value(client.get("LastDataDownlinkRate", {}))
                or _value(client.get("RxRate", {}))
                or _value(client.get("X_TP_RxRate", {}))
            )
            tx_rate = (
                _value(client.get("LastDataUplinkRate", {}))
                or _value(client.get("TxRate", {}))
                or _value(client.get("X_TP_TxRate", {}))
            )

            band = ssid_info.get("band") or _band_from_path_or_value(
                path=f"Device.WiFi.AccessPoint.{ap_id}.AssociatedDevice.{client_id}.",
                lower_layers=ssid_info.get("lower_layers"),
                ssid=ssid_info.get("ssid"),
            )

            clients.append({
                "source": "Device.WiFi.AccessPoint.AssociatedDevice",
                "ap_id": str(ap_id),
                "client_id": str(client_id),
                "ssid": ssid_info.get("ssid"),
                "bssid": ssid_info.get("bssid"),
                "band": band,
                "hostname": hostname,
                "ip_address": ip,
                "mac_address": mac,
                "active": bool(active) if active is not None else True,
                "rssi": _safe_int(rssi),
                "rx_rate": _safe_int(rx_rate),
                "tx_rate": _safe_int(tx_rate),
                "vendor": _vendor_from_mac(mac),
            })

    return clients


def _json_fallback_associated_devices(payload):
    """
    Fallback per vendor che espongono AssociatedDevice fuori dallo schema atteso.
    Estrae blocchi minimi dal payload serializzato. Non sostituisce il parser principale,
    ma aiuta a non perdere client nei router TP-Link.
    """
    try:
        raw = json.dumps(payload, ensure_ascii=False)
    except Exception:
        raw = str(payload)

    if "AssociatedDevice" not in raw:
        return []

    clients = []
    # Blocco euristico: segmenti contenenti MACAddress e SignalStrength/RSSI.
    mac_pattern = r'"(?:MACAddress|AssociatedDeviceMACAddress)"\s*:\s*\{[^{}]*"_value"\s*:\s*"([^"]+)"'
    real_mac_re = re.compile(r"^[0-9A-Fa-f]{2}([:-][0-9A-Fa-f]{2}){5}$")

    for match in re.finditer(mac_pattern, raw):
        mac = match.group(1)
        if not mac or not real_mac_re.match(mac):
            continue

        start = max(match.start() - 900, 0)
        end = min(match.end() + 1600, len(raw))
        block = raw[start:end]

        def grab(keys):
            if isinstance(keys, str):
                keys = [keys]
            for key in keys:
                p = rf'"{re.escape(key)}"\s*:\s*\{{[^{{}}]*"_value"\s*:\s*(".*?"|true|false|null|-?\d+(?:\.\d+)?)'
                m = re.search(p, block)
                if not m:
                    continue
                token = m.group(1)
                try:
                    return json.loads(token)
                except Exception:
                    if token == "true":
                        return True
                    if token == "false":
                        return False
                    try:
                        return int(float(token))
                    except Exception:
                        return token.strip('"')
            return None

        clients.append({
            "source": "json_fallback",
            "ap_id": None,
            "client_id": None,
            "ssid": grab(["SSID", "X_TP_SSID"]),
            "bssid": grab(["BSSID"]),
            "band": _band_from_path_or_value(block),
            "hostname": grab(["HostName", "Hostname", "X_TP_HostName"]) or "Unknown",
            "ip_address": grab(["IPAddress", "IPv4Address", "X_TP_IPAddress"]),
            "mac_address": mac,
            "active": grab(["Active"]) if grab(["Active"]) is not None else True,
            "rssi": _safe_int(grab(["SignalStrength", "RSSI", "X_TP_RSSI"])),
            "rx_rate": _safe_int(grab(["LastDataDownlinkRate", "RxRate", "X_TP_RxRate"])),
            "tx_rate": _safe_int(grab(["LastDataUplinkRate", "TxRate", "X_TP_TxRate"])),
            "vendor": _vendor_from_mac(mac),
        })

    return clients


def _dedupe_clients(clients):
    result = {}
    for client in clients:
        mac = (client.get("mac_address") or "").upper()
        if not mac:
            key = f"{client.get('ip_address')}-{client.get('hostname')}-{client.get('source')}"
        else:
            key = mac

        current = result.get(key)
        if not current:
            result[key] = client
            continue

        # Prefer associated device entries with richer WiFi fields.
        current_score = sum(1 for k in ["ssid", "band", "rssi", "rx_rate", "tx_rate", "ip_address", "hostname"] if current.get(k))
        new_score = sum(1 for k in ["ssid", "band", "rssi", "rx_rate", "tx_rate", "ip_address", "hostname"] if client.get(k))
        if new_score >= current_score:
            merged = {**current, **{k: v for k, v in client.items() if v not in (None, "", "UNKNOWN")}}
            result[key] = merged

    final = []
    for client in result.values():
        quality = _signal_quality(client.get("rssi"))
        client["signal_quality"] = quality
        client["signal_score"] = _quality_score(quality)
        if not client.get("vendor"):
            client["vendor"] = _vendor_from_mac(client.get("mac_address"))
        final.append(client)

    return sorted(final, key=lambda item: (
        not bool(item.get("active")),
        item.get("signal_score") if item.get("signal_score") is not None else 999,
        item.get("hostname") or "",
    ))


def _network_score(clients):
    active = [c for c in clients if c.get("active") is not False]
    if not active:
        return 90

    scores = [_quality_score(c.get("signal_quality")) for c in active]
    return round(sum(scores) / len(scores))


def _network_status(score):
    if score >= 90:
        return "EXCELLENT"
    if score >= 75:
        return "GOOD"
    if score >= 60:
        return "FAIR"
    return "POOR"


def _build_item(row):
    payload = row["raw_acs_payload"] or {}
    ssid_map = _extract_ssid_map(payload)

    clients = []
    clients.extend(_extract_associated_devices(payload, ssid_map))
    clients.extend(_extract_hosts(payload))
    if not clients:
        clients.extend(_json_fallback_associated_devices(payload))

    clients = _dedupe_clients(clients)

    active_clients = [c for c in clients if c.get("active") is not False]
    wireless_clients = [
        c for c in clients
        if c.get("band") in ["2.4GHz", "5GHz"]
        or c.get("source") in ["Device.WiFi.AccessPoint.AssociatedDevice", "json_fallback"]
    ]
    wired_clients = [
        c for c in clients
        if c.get("source") == "Device.Hosts.Host"
        and c.get("interface")
        and c.get("band") == "UNKNOWN"
    ]

    score = _network_score(clients)
    status = _network_status(score)

    poor = len([c for c in active_clients if c.get("signal_quality") == "POOR"])
    fair = len([c for c in active_clients if c.get("signal_quality") == "FAIR"])
    excellent = len([c for c in active_clients if c.get("signal_quality") == "EXCELLENT"])

    findings = []
    recommendations = []

    if not active_clients:
        findings.append("Nessun client attivo rilevato")
        recommendations.append("Nessuna azione richiesta se router in laboratorio")
    else:
        findings.append(f"{len(active_clients)} client attivi rilevati")

    if poor:
        findings.append(f"{poor} client con segnale scarso")
        recommendations.append("Verificare copertura WiFi, posizione router o eventuale mesh/repeater")
    if fair:
        findings.append(f"{fair} client con segnale medio")
        recommendations.append("Valutare ottimizzazione canale/banda per client con segnale medio")

    if not recommendations:
        recommendations.append("Nessuna azione richiesta")

    return {
        "device_id": str(row["id"]),
        "acs_device_id": row["acs_device_id"],
        "customer_name": row["customer_name"],
        "customer_code": row["customer_code"],
        "contract_number": row["contract_number"],
        "manufacturer": row["manufacturer"],
        "model": row["model"],
        "serial_number": row["serial_number"],
        "online": row["online"],
        "wan_ip": row["wan_ip"],
        "pppoe_username": row["pppoe_username"],

        "home_network_score": score,
        "home_network_status": status,

        "client_count": len(clients),
        "active_client_count": len(active_clients),
        "wireless_client_count": len(wireless_clients),
        "wired_client_count": len(wired_clients),
        "poor_signal_count": poor,
        "fair_signal_count": fair,
        "excellent_signal_count": excellent,

        "clients": clients,
        "findings": findings,
        "recommendations": recommendations,
    }


def _query_rows():
    return """
        SELECT
            d.id,
            d.acs_device_id,
            d.manufacturer,
            d.model,
            d.serial_number,
            d.online,
            d.wan_ip,
            d.pppoe_username,
            d.raw_acs_payload,
            c.customer_name,
            c.customer_code,
            c.contract_number
        FROM devices d
        LEFT JOIN customer_network_links l
          ON l.device_id = d.id
        LEFT JOIN customer_registry c
          ON c.id = l.customer_registry_id
    """


@router.get("/health")
async def health():
    return {"success": True, "module": "home-network"}


@router.get("/devices/{device_id}")
async def home_network_device(device_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text(_query_rows() + " WHERE d.id = :device_id LIMIT 1"),
        {"device_id": device_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Device not found")

    return {"success": True, "item": _build_item(row)}


@router.get("/summary")
async def home_network_summary(db: Session = Depends(get_db)):
    rows = db.execute(
        text(_query_rows() + " ORDER BY c.customer_name NULLS LAST, d.model")
    ).mappings().all()

    items = [_build_item(row) for row in rows]
    active_items = [item for item in items if item["active_client_count"] > 0]

    average = round(sum(item["home_network_score"] for item in items) / len(items), 2) if items else None

    return {
        "success": True,
        "devices": len(items),
        "devices_with_clients": len(active_items),
        "average_home_network_score": average,
        "total_clients": sum(item["client_count"] for item in items),
        "active_clients": sum(item["active_client_count"] for item in items),
        "wireless_clients": sum(item["wireless_client_count"] for item in items),
        "wired_clients": sum(item["wired_client_count"] for item in items),
        "poor_signal": sum(item["poor_signal_count"] for item in items),
        "fair_signal": sum(item["fair_signal_count"] for item in items),
        "excellent_signal": sum(item["excellent_signal_count"] for item in items),
        "excellent": len([item for item in items if item["home_network_status"] == "EXCELLENT"]),
        "good": len([item for item in items if item["home_network_status"] == "GOOD"]),
        "fair": len([item for item in items if item["home_network_status"] == "FAIR"]),
        "poor": len([item for item in items if item["home_network_status"] == "POOR"]),
        "items": items,
    }

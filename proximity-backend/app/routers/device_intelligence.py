from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
import json
import re

from app.db.session import get_db

try:
    from app.data.oui_database import OUI_VENDOR_MAP
except Exception:
    OUI_VENDOR_MAP = {}


router = APIRouter(
    prefix="/api/v1/device-intelligence",
    tags=["Customer Device Intelligence"],
)


DEFAULT_OUI_CATEGORY_MAP = {
    "A0FBC5": {"vendor": "Apple", "category": "SMARTPHONE"},
    "B4FBE3": {"vendor": "Unknown", "category": "SMARTPHONE"},
    "22BFCE": {"vendor": "Unknown", "category": "SMARTPHONE"},
    "D23CDC": {"vendor": "OPPO", "category": "SMARTPHONE"},
    "DEB9C2": {"vendor": "OPPO", "category": "SMARTPHONE"},
    "FEFFE8": {"vendor": "Samsung", "category": "SMARTPHONE"},
    "BA715E": {"vendor": "Samsung", "category": "SMARTPHONE"},
    "805B65": {"vendor": "LG", "category": "SMART_TV"},
    "A842A1": {"vendor": "TP-Link", "category": "ROUTER"},
    "E848B8": {"vendor": "TP-Link", "category": "ROUTER"},
    "44650D": {"vendor": "Amazon", "category": "ALEXA"},
    "3C5AB4": {"vendor": "Google", "category": "SMART_DEVICE"},
    "F84F57": {"vendor": "Samsung", "category": "SMART_TV"},
    "286D97": {"vendor": "Sony", "category": "PLAYSTATION"},
    "AC416A": {"vendor": "Unknown", "category": "UNKNOWN"},
    "1C93C4": {"vendor": "Unknown", "category": "UNKNOWN"},
    "3E598A": {"vendor": "Motorola", "category": "SMARTPHONE"},
    "6411A4": {"vendor": "Motorola", "category": "SMARTPHONE"},
    "A2F5D9": {"vendor": "Realme", "category": "SMARTPHONE"},
    "5A4F59": {"vendor": "Realme", "category": "SMARTPHONE"},
}


def _oui_key_to_colon(key):
    key = str(key or "").upper().replace(":", "").replace("-", "").strip()
    if len(key) < 6:
        return None
    key = key[:6]
    return f"{key[0:2]}:{key[2:4]}:{key[4:6]}"


def _build_oui_map():
    merged = {}

    for key, value in DEFAULT_OUI_CATEGORY_MAP.items():
        colon_key = _oui_key_to_colon(key)
        if colon_key:
            merged[colon_key] = value if isinstance(value, dict) else {"vendor": str(value), "category": "UNKNOWN"}

    for key, value in OUI_VENDOR_MAP.items():
        colon_key = _oui_key_to_colon(key)
        if not colon_key:
            continue

        if isinstance(value, dict):
            vendor = value.get("vendor") or value.get("name") or "Unknown"
            category = value.get("category") or merged.get(colon_key, {}).get("category") or "UNKNOWN"
        else:
            vendor = str(value)
            category = merged.get(colon_key, {}).get("category") or "UNKNOWN"

        merged[colon_key] = {
            "vendor": vendor,
            "category": category,
        }

    return merged


OUI_MAP = _build_oui_map()


CATEGORY_LABELS = {
    "SMARTPHONE": "Smartphone",
    "TABLET": "Tablet",
    "LAPTOP": "Laptop",
    "PC": "PC",
    "SMART_TV": "Smart TV",
    "PLAYSTATION": "PlayStation",
    "XBOX": "Xbox",
    "ALEXA": "Alexa / Smart Speaker",
    "CAMERA": "Camera",
    "IOT": "IoT",
    "PRINTER": "Printer",
    "ROUTER": "Router / Network",
    "SMART_DEVICE": "Smart Device",
    "UNKNOWN": "Unknown",
}


def _value(node, default=None):
    if isinstance(node, dict):
        return node.get("_value", default)
    return default


def _safe_int(value):
    try:
        if value in (None, ""):
            return None
        return int(float(value))
    except Exception:
        return None


def _normalize_mac(mac):
    if not mac:
        return None
    mac = str(mac).strip().upper().replace("-", ":")
    if not re.match(r"^[0-9A-F]{2}(:[0-9A-F]{2}){5}$", mac):
        return None
    return mac


def _oui(mac):
    mac = _normalize_mac(mac)
    if not mac:
        return None
    return mac[:8]


def _is_locally_administered_mac(mac):
    mac = _normalize_mac(mac)
    if not mac:
        return False

    try:
        first_octet = int(mac.split(":")[0], 16)
        return bool(first_octet & 0b00000010)
    except Exception:
        return False


def _vendor_confidence(vendor, category, hostname=None, randomized=False):
    hostname_category = _classify_by_hostname(hostname)

    if randomized:
        return 55
    if vendor and vendor != "Unknown" and category and category != "UNKNOWN":
        return 95
    if vendor and vendor != "Unknown":
        return 85
    if hostname_category:
        return 75
    if category and category != "UNKNOWN":
        return 60
    return 20


def _signal_quality(rssi):
    rssi = _safe_int(rssi)
    if rssi is None:
        return "UNKNOWN"

    if rssi < 0:
        if rssi >= -55:
            return "EXCELLENT"
        if rssi >= -67:
            return "GOOD"
        if rssi >= -75:
            return "FAIR"
        return "POOR"

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


def _band_from_path_or_value(path=None, lower_layers=None, ssid=None):
    text_blob = " ".join([str(path or ""), str(lower_layers or ""), str(ssid or "")]).lower()
    if "radio.2" in text_blob or "5g" in text_blob or "5ghz" in text_blob:
        return "5GHz"
    if "radio.1" in text_blob or "2.4" in text_blob or "2g" in text_blob:
        return "2.4GHz"
    return "UNKNOWN"


def _classify_by_hostname(hostname):
    name = (hostname or "").lower()

    if not name or name == "unknown":
        return None

    if any(token in name for token in ["iphone", "galaxy", "oppo", "realme", "moto", "redmi", "xiaomi", "s24"]):
        return "SMARTPHONE"
    if any(token in name for token in ["ipad", "tablet"]):
        return "TABLET"
    if any(token in name for token in ["macbook", "notebook", "laptop"]):
        return "LAPTOP"
    if any(token in name for token in ["desktop", "pc-", "windows"]):
        return "PC"
    if any(token in name for token in ["tv", "webos", "lgwebos", "samsungtv", "bravia"]):
        return "SMART_TV"
    if any(token in name for token in ["playstation", "ps5", "ps4"]):
        return "PLAYSTATION"
    if any(token in name for token in ["xbox"]):
        return "XBOX"
    if any(token in name for token in ["echo", "alexa"]):
        return "ALEXA"
    if any(token in name for token in ["cam", "camera", "ipc"]):
        return "CAMERA"
    if any(token in name for token in ["printer", "epson", "hp-", "canon"]):
        return "PRINTER"

    return None


def _classify_device(mac=None, hostname=None, vendor_hint=None, source=None, band=None, online=None):
    normalized = _normalize_mac(mac)
    oui = _oui(normalized)

    oui_info = OUI_MAP.get(oui, {}) if oui else {}
    hostname_category = _classify_by_hostname(hostname)

    vendor = vendor_hint or oui_info.get("vendor")
    category = hostname_category or oui_info.get("category") or "UNKNOWN"

    randomized = _is_locally_administered_mac(normalized)

    # Unknown Resolver:
    # - MAC local-admin/randomizzato: quasi sempre private MAC di smartphone/tablet.
    # - AssociatedDevice WiFi attivo senza hostname: probabilmente device mobile con MAC privato.
    if (not vendor or vendor == "Unknown") and randomized:
        vendor = "Randomized MAC"
        if category == "UNKNOWN":
            category = "SMARTPHONE"

    if (not vendor or vendor == "Unknown") and source == "Device.WiFi.AccessPoint.AssociatedDevice" and online is not False:
        vendor = "Randomized MAC"
        if category == "UNKNOWN":
            category = "SMARTPHONE"

    if not vendor:
        vendor = "Unknown"

    confidence = _vendor_confidence(vendor, category, hostname, randomized=(vendor == "Randomized MAC"))
    if vendor == "Randomized MAC":
        fingerprint_source = "RANDOMIZED_MAC"
    elif hostname_category:
        fingerprint_source = "HOSTNAME"
    elif oui_info:
        fingerprint_source = "OUI_DATABASE"
    else:
        fingerprint_source = "UNKNOWN"

    return {
        "mac_address": normalized,
        "oui": oui,
        "vendor": vendor,
        "category": category,
        "category_label": CATEGORY_LABELS.get(category, category.title()),
        "fingerprint_confidence": confidence,
        "fingerprint_source": fingerprint_source,
        "randomized_mac": vendor == "Randomized MAC",
    }


def _extract_ssid_map(payload):
    ssids = {}
    wifi = payload.get("Device", {}).get("WiFi", {})
    ssid_tree = wifi.get("SSID", {})

    if isinstance(ssid_tree, dict):
        for ssid_id, ssid_data in ssid_tree.items():
            if not isinstance(ssid_data, dict):
                continue

            ref = f"Device.WiFi.SSID.{ssid_id}."
            ssids[ref] = {
                "ssid_id": str(ssid_id),
                "ssid": _value(ssid_data.get("SSID", {})),
                "bssid": _value(ssid_data.get("BSSID", {})),
                "lower_layers": _value(ssid_data.get("LowerLayers", {})),
                "status": _value(ssid_data.get("Status", {})),
                "enabled": _value(ssid_data.get("Enable", {})),
                "band": _band_from_path_or_value(
                    path=ref,
                    lower_layers=_value(ssid_data.get("LowerLayers", {})),
                    ssid=_value(ssid_data.get("SSID", {})),
                ),
            }

    return ssids


def _extract_hosts(payload):
    hosts = []
    host_tree = payload.get("Device", {}).get("Hosts", {}).get("Host", {})

    if isinstance(host_tree, dict):
        for host_id, host in host_tree.items():
            if not isinstance(host, dict):
                continue

            mac = _normalize_mac(_value(host.get("PhysAddress", {})) or _value(host.get("MACAddress", {})))
            hostname = _value(host.get("HostName", {})) or _value(host.get("Hostname", {})) or _value(host.get("Name", {})) or "Unknown"

            if not mac and hostname == "Unknown":
                continue

            hosts.append({
                "source": "Device.Hosts.Host",
                "host_id": str(host_id),
                "hostname": hostname,
                "ip_address": _value(host.get("IPAddress", {})) or _value(host.get("IPv4Address", {})),
                "mac_address": mac,
                "active": _value(host.get("Active", {})),
                "interface": _value(host.get("Layer1Interface", {})) or _value(host.get("Layer3Interface", {})),
                "band": _band_from_path_or_value(_value(host.get("Layer1Interface", {})) or _value(host.get("Layer3Interface", {}))),
                "rssi": _safe_int(_value(host.get("SignalStrength", {})) or _value(host.get("RSSI", {}))),
                "rx_rate": _safe_int(_value(host.get("RxRate", {})) or _value(host.get("RXRate", {}))),
                "tx_rate": _safe_int(_value(host.get("TxRate", {})) or _value(host.get("TXRate", {}))),
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

            mac = _normalize_mac(
                _value(client.get("MACAddress", {}))
                or _value(client.get("AssociatedDeviceMACAddress", {}))
                or _value(client.get("PhysAddress", {}))
            )
            hostname = (
                _value(client.get("HostName", {}))
                or _value(client.get("Hostname", {}))
                or _value(client.get("Name", {}))
                or _value(client.get("X_TP_HostName", {}))
                or "Unknown"
            )

            if not mac and hostname == "Unknown":
                continue

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

            clients.append({
                "source": "Device.WiFi.AccessPoint.AssociatedDevice",
                "ap_id": str(ap_id),
                "client_id": str(client_id),
                "hostname": hostname,
                "ip_address": _value(client.get("IPAddress", {})) or _value(client.get("IPv4Address", {})) or _value(client.get("X_TP_IPAddress", {})),
                "mac_address": mac,
                "active": _value(client.get("Active", {})) if _value(client.get("Active", {})) is not None else True,
                "ssid": ssid_info.get("ssid"),
                "bssid": ssid_info.get("bssid"),
                "band": ssid_info.get("band") or _band_from_path_or_value(
                    path=f"Device.WiFi.AccessPoint.{ap_id}.AssociatedDevice.{client_id}.",
                    lower_layers=ssid_info.get("lower_layers"),
                    ssid=ssid_info.get("ssid"),
                ),
                "rssi": _safe_int(rssi),
                "rx_rate": _safe_int(rx_rate),
                "tx_rate": _safe_int(tx_rate),
            })

    return clients


def _dedupe_devices(devices):
    result = {}

    for item in devices:
        mac = _normalize_mac(item.get("mac_address"))
        hostname = item.get("hostname") or "Unknown"

        if mac:
            key = mac
        else:
            key = f"{hostname}-{item.get('ip_address')}-{item.get('source')}"

        current = result.get(key)
        if not current:
            result[key] = item
            continue

        current_score = sum(1 for k in ["ssid", "band", "rssi", "ip_address", "hostname", "active"] if current.get(k) not in (None, "", "UNKNOWN"))
        new_score = sum(1 for k in ["ssid", "band", "rssi", "ip_address", "hostname", "active"] if item.get(k) not in (None, "", "UNKNOWN"))

        if new_score >= current_score:
            merged = {**current, **{k: v for k, v in item.items() if v not in (None, "", "UNKNOWN")}}
            result[key] = merged

    output = []
    for item in result.values():
        online = item.get("active")
        if online is None:
            online = True if item.get("source") == "Device.WiFi.AccessPoint.AssociatedDevice" else False

        cls = _classify_device(
            mac=item.get("mac_address"),
            hostname=item.get("hostname"),
            source=item.get("source"),
            band=item.get("band"),
            online=online,
        )
        quality = _signal_quality(item.get("rssi"))

        enriched = {
            **item,
            **cls,
            "online": bool(online),
            "signal_quality": quality,
            "signal_score": _quality_score(quality),
        }
        output.append(enriched)

    return sorted(output, key=lambda item: (
        not item.get("online", False),
        item.get("category", "UNKNOWN"),
        item.get("hostname", "Unknown"),
    ))


def _device_score(devices):
    online = [d for d in devices if d.get("online")]
    if not online:
        return 90

    scores = [_quality_score(d.get("signal_quality")) for d in online]
    return round(sum(scores) / len(scores))


def _status_from_score(score):
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

    discovered = []
    discovered.extend(_extract_associated_devices(payload, ssid_map))
    discovered.extend(_extract_hosts(payload))

    devices = _dedupe_devices(discovered)

    online_devices = [d for d in devices if d.get("online")]
    score = _device_score(devices)
    status = _status_from_score(score)

    by_category = {}
    by_vendor = {}

    for d in devices:
        category = d.get("category", "UNKNOWN")
        vendor = d.get("vendor", "Unknown")
        by_category[category] = by_category.get(category, 0) + 1
        by_vendor[vendor] = by_vendor.get(vendor, 0) + 1

    findings = []
    recommendations = []

    unknown = by_category.get("UNKNOWN", 0)
    randomized_macs = len([d for d in devices if d.get("randomized_mac")])
    poor = len([d for d in online_devices if d.get("signal_quality") == "POOR"])

    if devices:
        findings.append(f"{len(devices)} dispositivi identificati")
    else:
        findings.append("Nessun dispositivo cliente rilevato")

    if unknown:
        findings.append(f"{unknown} dispositivi non classificati")
        recommendations.append("Arricchire database OUI/fingerprint per ridurre gli Unknown")

    if randomized_macs:
        findings.append(f"{randomized_macs} dispositivi con MAC randomizzato/private address")

    if poor:
        findings.append(f"{poor} dispositivi online con segnale scarso")
        recommendations.append("Verificare copertura WiFi o posizionamento CPE")

    if not recommendations:
        recommendations.append("Nessuna azione richiesta")

    technology_profile = {
        "android_devices": (
            by_vendor.get("Samsung", 0)
            + by_vendor.get("OPPO", 0)
            + by_vendor.get("Motorola", 0)
            + by_vendor.get("Realme", 0)
            + by_vendor.get("Xiaomi", 0)
            + by_vendor.get("Google", 0)
        ),
        "apple_devices": by_vendor.get("Apple", 0),
        "smart_tvs": by_category.get("SMART_TV", 0),
        "unknown_devices": by_category.get("UNKNOWN", 0),
        "randomized_macs": randomized_macs,
        "mobile_devices": by_category.get("SMARTPHONE", 0) + by_category.get("TABLET", 0),
        "network_devices": by_category.get("ROUTER", 0),
        "iot_devices": by_category.get("IOT", 0) + by_category.get("SMART_DEVICE", 0) + by_category.get("CAMERA", 0) + by_category.get("ALEXA", 0),
    }

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

        "device_intelligence_score": score,
        "device_intelligence_status": status,

        "total_devices": len(devices),
        "online_devices": len(online_devices),
        "unknown_devices": by_category.get("UNKNOWN", 0),
        "randomized_macs": randomized_macs,
        "smartphones": by_category.get("SMARTPHONE", 0),
        "smart_tvs": by_category.get("SMART_TV", 0),
        "gaming_devices": by_category.get("PLAYSTATION", 0) + by_category.get("XBOX", 0),
        "iot_devices": by_category.get("IOT", 0) + by_category.get("SMART_DEVICE", 0) + by_category.get("CAMERA", 0) + by_category.get("ALEXA", 0),
        "routers": by_category.get("ROUTER", 0),

        "by_category": by_category,
        "by_vendor": by_vendor,
        "technology_profile": technology_profile,
        "devices": devices,
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
    return {"success": True, "module": "device-intelligence"}


@router.get("/devices/{device_id}")
async def device_intelligence_device(device_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text(_query_rows() + " WHERE d.id = :device_id LIMIT 1"),
        {"device_id": device_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Device not found")

    return {"success": True, "item": _build_item(row)}


@router.get("/summary")
async def device_intelligence_summary(db: Session = Depends(get_db)):
    rows = db.execute(
        text(_query_rows() + " ORDER BY c.customer_name NULLS LAST, d.model")
    ).mappings().all()

    items = [_build_item(row) for row in rows]

    total_devices = sum(item["total_devices"] for item in items)
    online_devices = sum(item["online_devices"] for item in items)
    randomized_macs = sum(item.get("randomized_macs", 0) for item in items)

    category_totals = {}
    vendor_totals = {}

    for item in items:
        for category, count in item.get("by_category", {}).items():
            category_totals[category] = category_totals.get(category, 0) + count
        for vendor, count in item.get("by_vendor", {}).items():
            vendor_totals[vendor] = vendor_totals.get(vendor, 0) + count

    technology_profile = {
        "android_devices": sum(item.get("technology_profile", {}).get("android_devices", 0) for item in items),
        "apple_devices": sum(item.get("technology_profile", {}).get("apple_devices", 0) for item in items),
        "smart_tvs": sum(item.get("technology_profile", {}).get("smart_tvs", 0) for item in items),
        "unknown_devices": sum(item.get("technology_profile", {}).get("unknown_devices", 0) for item in items),
        "randomized_macs": sum(item.get("technology_profile", {}).get("randomized_macs", 0) for item in items),
        "mobile_devices": sum(item.get("technology_profile", {}).get("mobile_devices", 0) for item in items),
        "network_devices": sum(item.get("technology_profile", {}).get("network_devices", 0) for item in items),
        "iot_devices": sum(item.get("technology_profile", {}).get("iot_devices", 0) for item in items),
    }

    average = round(sum(item["device_intelligence_score"] for item in items) / len(items), 2) if items else None

    return {
        "success": True,
        "customers": len(items),
        "average_device_intelligence_score": average,
        "total_devices": total_devices,
        "online_devices": online_devices,
        "unknown_devices": category_totals.get("UNKNOWN", 0),
        "randomized_macs": randomized_macs,
        "smartphones": category_totals.get("SMARTPHONE", 0),
        "smart_tvs": category_totals.get("SMART_TV", 0),
        "gaming_devices": category_totals.get("PLAYSTATION", 0) + category_totals.get("XBOX", 0),
        "iot_devices": category_totals.get("IOT", 0) + category_totals.get("SMART_DEVICE", 0) + category_totals.get("CAMERA", 0) + category_totals.get("ALEXA", 0),
        "routers": category_totals.get("ROUTER", 0),
        "by_category": category_totals,
        "by_vendor": vendor_totals,
        "technology_profile": technology_profile,
        "excellent": len([item for item in items if item["device_intelligence_status"] == "EXCELLENT"]),
        "good": len([item for item in items if item["device_intelligence_status"] == "GOOD"]),
        "fair": len([item for item in items if item["device_intelligence_status"] == "FAIR"]),
        "poor": len([item for item in items if item["device_intelligence_status"] == "POOR"]),
        "items": items,
    }


@router.get("/vendors")
async def device_intelligence_vendors(db: Session = Depends(get_db)):
    summary = await device_intelligence_summary(db)
    vendors = summary.get("by_vendor", {})

    return {
        "success": True,
        "count": len(vendors),
        "vendors": vendors,
        "items": [
            {"vendor": vendor, "count": count}
            for vendor, count in sorted(vendors.items(), key=lambda item: (-item[1], item[0]))
        ],
    }


@router.get("/oui-database")
async def oui_database():
    return {
        "success": True,
        "count": len(OUI_VENDOR_MAP),
        "effective_count": len(OUI_MAP),
        "items": OUI_VENDOR_MAP,
        "effective_items": OUI_MAP,
    }

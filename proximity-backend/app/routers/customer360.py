from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
import asyncio
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.genieacs import GenieACSClient


router = APIRouter(
    prefix="/api/v1/customer360",
    tags=["Customer 360"],
)


def _status_from_score(score):
    if score is None:
        return "UNKNOWN"
    if score >= 90:
        return "EXCELLENT"
    if score >= 75:
        return "GOOD"
    if score >= 60:
        return "FAIR"
    return "POOR"


def _risk_from_scores(*scores):
    clean = [s for s in scores if s is not None]
    if not clean:
        return "UNKNOWN"
    worst = min(clean)
    if worst >= 85:
        return "LOW"
    if worst >= 65:
        return "MEDIUM"
    return "HIGH"


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


def _normalize_mac(mac):
    if not mac:
        return None
    mac = str(mac).strip().upper().replace("-", ":")
    parts = mac.split(":")
    if len(parts) != 6 or any(len(part) != 2 for part in parts):
        return None
    return ":".join(parts)


def _mac_prefix(mac):
    mac = _normalize_mac(mac)
    if not mac:
        return None
    return mac[:8]


def _is_locally_administered_mac(mac):
    mac = _normalize_mac(mac)
    if not mac:
        return False
    try:
        return bool(int(mac.split(":")[0], 16) & 0b00000010)
    except Exception:
        return False


DEVICE_OUI_IDENTITY = {
    "A0:FB:C5": {"vendor": "Apple", "category": "SMARTPHONE", "display_name": "Apple iPhone", "icon": "smartphone", "confidence": 95},
    "D2:3C:DC": {"vendor": "OPPO", "category": "SMARTPHONE", "display_name": "OPPO Smartphone", "icon": "smartphone", "confidence": 95},
    "DE:B9:C2": {"vendor": "OPPO", "category": "SMARTPHONE", "display_name": "OPPO Smartphone", "icon": "smartphone", "confidence": 95},
    "BA:71:5E": {"vendor": "Samsung", "category": "SMARTPHONE", "display_name": "Samsung Smartphone", "icon": "smartphone", "confidence": 95},
    "FE:FF:E8": {"vendor": "Samsung", "category": "SMARTPHONE", "display_name": "Samsung Smartphone", "icon": "smartphone", "confidence": 95},
    "80:5B:65": {"vendor": "LG", "category": "SMART_TV", "display_name": "LG Smart TV", "icon": "tv", "confidence": 95},
    "3E:59:8A": {"vendor": "Motorola", "category": "SMARTPHONE", "display_name": "Motorola Smartphone", "icon": "smartphone", "confidence": 95},
    "64:11:A4": {"vendor": "Motorola", "category": "SMARTPHONE", "display_name": "Motorola Smartphone", "icon": "smartphone", "confidence": 95},
    "A2:F5:D9": {"vendor": "Realme", "category": "SMARTPHONE", "display_name": "Realme Smartphone", "icon": "smartphone", "confidence": 95},
    "5A:4F:59": {"vendor": "Realme", "category": "SMARTPHONE", "display_name": "Realme Smartphone", "icon": "smartphone", "confidence": 95},
    "A8:42:A1": {"vendor": "TP-Link", "category": "ROUTER", "display_name": "TP-Link Router", "icon": "router", "confidence": 95},
    "E8:48:B8": {"vendor": "TP-Link", "category": "ROUTER", "display_name": "TP-Link Router", "icon": "router", "confidence": 95},
    "44:65:0D": {"vendor": "Amazon", "category": "ALEXA", "display_name": "Amazon Alexa", "icon": "speaker", "confidence": 95},
    "28:6D:97": {"vendor": "Sony", "category": "PLAYSTATION", "display_name": "Sony PlayStation", "icon": "gamepad", "confidence": 95},
}


def _identity_from_hostname(hostname):
    name = (hostname or "").strip()
    low = name.lower()

    if not low or low == "unknown":
        return None

    if "iphone" in low:
        return {"vendor": "Apple", "category": "SMARTPHONE", "display_name": name, "icon": "smartphone", "confidence": 95, "source": "HOSTNAME"}
    if "ipad" in low:
        return {"vendor": "Apple", "category": "TABLET", "display_name": name, "icon": "tablet", "confidence": 95, "source": "HOSTNAME"}
    if "galaxy" in low or "s24" in low or "samsung" in low:
        return {"vendor": "Samsung", "category": "SMARTPHONE", "display_name": name, "icon": "smartphone", "confidence": 95, "source": "HOSTNAME"}
    if "oppo" in low:
        return {"vendor": "OPPO", "category": "SMARTPHONE", "display_name": name, "icon": "smartphone", "confidence": 95, "source": "HOSTNAME"}
    if "realme" in low:
        return {"vendor": "Realme", "category": "SMARTPHONE", "display_name": name, "icon": "smartphone", "confidence": 95, "source": "HOSTNAME"}
    if "moto" in low or "motorola" in low:
        return {"vendor": "Motorola", "category": "SMARTPHONE", "display_name": name, "icon": "smartphone", "confidence": 95, "source": "HOSTNAME"}
    if "redmi" in low or "xiaomi" in low:
        return {"vendor": "Xiaomi", "category": "SMARTPHONE", "display_name": name, "icon": "smartphone", "confidence": 90, "source": "HOSTNAME"}
    if "webos" in low or "lgwebos" in low:
        return {"vendor": "LG", "category": "SMART_TV", "display_name": "LG Smart TV", "icon": "tv", "confidence": 95, "source": "HOSTNAME"}
    if "tv" in low or "bravia" in low:
        return {"vendor": "Unknown", "category": "SMART_TV", "display_name": name, "icon": "tv", "confidence": 85, "source": "HOSTNAME"}
    if "playstation" in low or "ps5" in low or "ps4" in low:
        return {"vendor": "Sony", "category": "PLAYSTATION", "display_name": "Sony PlayStation", "icon": "gamepad", "confidence": 95, "source": "HOSTNAME"}
    if "xbox" in low:
        return {"vendor": "Microsoft", "category": "XBOX", "display_name": "Microsoft Xbox", "icon": "gamepad", "confidence": 95, "source": "HOSTNAME"}
    if "echo" in low or "alexa" in low:
        return {"vendor": "Amazon", "category": "ALEXA", "display_name": "Amazon Alexa", "icon": "speaker", "confidence": 95, "source": "HOSTNAME"}
    if "printer" in low or "epson" in low or "canon" in low:
        return {"vendor": "Unknown", "category": "PRINTER", "display_name": name, "icon": "printer", "confidence": 80, "source": "HOSTNAME"}

    return {"vendor": "Unknown", "category": "UNKNOWN", "display_name": name, "icon": "device", "confidence": 45, "source": "HOSTNAME"}


def _infer_device_identity(client):
    hostname = client.get("hostname")
    mac = _normalize_mac(client.get("mac_address"))
    prefix = _mac_prefix(mac)

    hostname_identity = _identity_from_hostname(hostname)
    if hostname_identity and hostname_identity.get("category") != "UNKNOWN":
        identity = hostname_identity
    elif prefix in DEVICE_OUI_IDENTITY:
        identity = {**DEVICE_OUI_IDENTITY[prefix], "source": "OUI"}
    elif _is_locally_administered_mac(mac) and client.get("online"):
        identity = {
            "vendor": "Randomized MAC",
            "category": "SMARTPHONE",
            "display_name": "Smartphone con MAC privato",
            "icon": "smartphone",
            "confidence": 55,
            "source": "RANDOMIZED_MAC",
        }
    elif hostname_identity:
        identity = hostname_identity
    else:
        identity = {
            "vendor": "Unknown",
            "category": "UNKNOWN",
            "display_name": "Dispositivo sconosciuto",
            "icon": "device",
            "confidence": 20,
            "source": "UNKNOWN",
        }

    return {
        **client,
        "mac_address": mac or client.get("mac_address"),
        "display_name": identity.get("display_name"),
        "device_vendor": identity.get("vendor"),
        "device_category": identity.get("category"),
        "device_icon": identity.get("icon"),
        "identity_confidence": identity.get("confidence"),
        "identity_source": identity.get("source"),
    }


def _infer_behavior_profile(client):
    vendor = client.get("device_vendor")
    category = client.get("device_category")
    source = client.get("source")
    online = bool(client.get("online"))
    rssi = client.get("rssi")
    hostname = (client.get("hostname") or "").lower()
    identity_source = client.get("identity_source")
    confidence = client.get("identity_confidence") or 20

    profile = "UNKNOWN"
    role = "UNKNOWN"
    device_type = category or "UNKNOWN"
    behavioral_confidence = confidence

    if category in ["SMARTPHONE", "TABLET"]:
        profile = "PERSONAL_DEVICE"
        role = "PERSONAL"
        device_type = category
        behavioral_confidence = max(confidence, 85)
    elif category == "SMART_TV":
        profile = "ENTERTAINMENT_DEVICE"
        role = "STREAMING"
        device_type = "SMART_TV"
        behavioral_confidence = max(confidence, 90)
    elif category in ["PLAYSTATION", "XBOX"]:
        profile = "GAMING_CONSOLE"
        role = "GAMING"
        device_type = category
        behavioral_confidence = max(confidence, 90)
    elif category in ["ALEXA", "SMART_DEVICE"]:
        profile = "VOICE_ASSISTANT"
        role = "SMART_HOME"
        device_type = category
        behavioral_confidence = max(confidence, 85)
    elif category == "PRINTER":
        profile = "PRINTER"
        role = "PERIPHERAL"
        device_type = "PRINTER"
        behavioral_confidence = max(confidence, 80)
    elif category == "ROUTER":
        profile = "NETWORK_DEVICE"
        role = "INFRASTRUCTURE"
        device_type = "ROUTER"
        behavioral_confidence = max(confidence, 95)

    # Behavioral fallback: active WiFi station with RSSI but no name/OUI is normally a mobile/private device.
    if profile == "UNKNOWN" and source == "AssociatedDevice" and online and rssi is not None:
        profile = "PERSONAL_DEVICE"
        role = "PERSONAL"
        device_type = "SMARTPHONE"
        behavioral_confidence = max(confidence, 65)

    # Hostname behavioral hints.
    if profile == "UNKNOWN":
        if any(token in hostname for token in ["laptop", "notebook", "macbook", "windows"]):
            profile = "LAPTOP"
            role = "COMPUTER"
            device_type = "LAPTOP"
            behavioral_confidence = max(confidence, 75)
        elif any(token in hostname for token in ["cam", "camera", "ipc"]):
            profile = "IOT_DEVICE"
            role = "SECURITY"
            device_type = "CAMERA"
            behavioral_confidence = max(confidence, 75)
        elif any(token in hostname for token in ["printer", "epson", "canon", "hp-"]):
            profile = "PRINTER"
            role = "PERIPHERAL"
            device_type = "PRINTER"
            behavioral_confidence = max(confidence, 75)

    identified = device_type != "UNKNOWN" or profile != "UNKNOWN"

    return {
        **client,
        "device_type": device_type,
        "behavior_profile": profile,
        "device_role": role,
        "behavioral_confidence": behavioral_confidence,
        "identified": identified,
        "is_personal_device": profile == "PERSONAL_DEVICE",
        "is_entertainment_device": profile in ["ENTERTAINMENT_DEVICE", "GAMING_CONSOLE"],
        "is_infrastructure": profile == "NETWORK_DEVICE",
    }


def _apply_behavioral_fingerprinting(devices):
    return [_infer_behavior_profile(device) for device in devices]


def _extract_acs(payload):
    mgmt = payload.get("Device", {}).get("ManagementServer", {})
    return {
        "acs_online": bool(
            _value(mgmt.get("EnableCWMP", {}))
            and _value(mgmt.get("PeriodicInformEnable", {}))
        ),
        "acs_url": _value(mgmt.get("URL", {})),
        "periodic_inform_enabled": _value(mgmt.get("PeriodicInformEnable", {})),
        "periodic_inform_interval": _value(mgmt.get("PeriodicInformInterval", {})),
        "connection_request_url": _value(mgmt.get("ConnectionRequestURL", {})),
    }


def _extract_internet(payload, row):
    ppp = (
        payload.get("Device", {})
               .get("PPP", {})
               .get("Interface", {})
               .get("1", {})
    )

    ip_interfaces = (
        payload.get("Device", {})
               .get("IP", {})
               .get("Interface", {})
    )

    ip_ref = None
    ipv4_address = row["wan_ip"]

    if isinstance(ip_interfaces, dict):
        for iface_id, iface in ip_interfaces.items():
            if not isinstance(iface, dict):
                continue
            lower_layers = _value(iface.get("LowerLayers", {}))
            ipv4_tree = iface.get("IPv4Address", {})
            if lower_layers == "Device.PPP.Interface.1." or _value(iface.get("Status", {})) == "Up":
                ip_ref = f"Device.IP.Interface.{iface_id}."
                if isinstance(ipv4_tree, dict):
                    for _, addr in ipv4_tree.items():
                        if isinstance(addr, dict):
                            ip = _value(addr.get("IPAddress", {}))
                            if ip and ip != "0.0.0.0":
                                ipv4_address = ip
                                break

    ppp_status = _value(ppp.get("ConnectionStatus", {}))
    last_error = _value(ppp.get("LastConnectionError", {}))
    uptime = (
        _value(payload.get("Device", {}).get("DeviceInfo", {}).get("UpTime", {}))
        or _value(ppp.get("Uptime", {}))
    )

    score = 100
    findings = []

    if not row["online"]:
        score -= 40
        findings.append("Router offline")
    if ppp_status and str(ppp_status).lower() != "connected":
        score -= 35
        findings.append(f"PPP non connesso ({ppp_status})")
    if last_error and last_error != "ERROR_NONE":
        score -= 25
        findings.append(f"Errore connessione: {last_error}")
    if not ipv4_address:
        score -= 20
        findings.append("WAN IP non rilevato")

    score = max(0, min(100, score))

    if not findings:
        findings.append("Internet stabile")

    return {
        "internet_score": score,
        "internet_status": _status_from_score(score),
        "ppp_status": ppp_status or ("Connected" if row["wan_ip"] else None),
        "wan_ip": ipv4_address,
        "pppoe_username": row["pppoe_username"],
        "ip_interface_ref": ip_ref,
        "last_connection_error": last_error,
        "session_uptime_seconds": _safe_int(uptime),
        "findings": findings,
    }


def _extract_voice(payload, row):
    services = payload.get("Device", {}).get("Services", {})
    voice_services = services.get("VoiceService", {})

    if not isinstance(voice_services, dict) or not voice_services:
        return {
            "has_voice": False,
            "voip_score": None,
            "voip_status": "NOT_SUPPORTED",
            "risk_level": "NONE",
            "directory_number": None,
            "registrar_server": None,
            "proxy_server": None,
        }

    raw = str(payload)

    def pick(name):
        marker = f"'{name}'"
        if marker not in raw and f'"{name}"' not in raw:
            return None

        # Prefer robust JSON-like object walk.
        def walk(tree):
            if isinstance(tree, dict):
                if name in tree:
                    value = _value(tree.get(name))
                    if value not in (None, ""):
                        return value
                for v in tree.values():
                    found = walk(v)
                    if found not in (None, ""):
                        return found
            elif isinstance(tree, list):
                for v in tree:
                    found = walk(v)
                    if found not in (None, ""):
                        return found
            return None

        return walk(payload)

    registrar = pick("RegistrarServer")
    proxy = pick("ProxyServer")
    directory = pick("DirectoryNumber") or pick("URI")
    auth = pick("AuthUserName")

    score = 100
    if not registrar:
        score -= 20
    if not directory:
        score -= 15
    if not auth:
        score -= 15
    if not row["online"]:
        score -= 40

    score = max(0, min(100, score))

    return {
        "has_voice": True,
        "voip_score": score,
        "voip_status": _status_from_score(score) if score < 90 else "OK",
        "risk_level": _risk_from_scores(score),
        "directory_number": directory,
        "auth_username": auth,
        "registrar_server": registrar,
        "proxy_server": proxy,
    }


def _extract_wifi_and_devices(payload):
    wifi = payload.get("Device", {}).get("WiFi", {})
    ssid_tree = wifi.get("SSID", {})
    ap_tree = wifi.get("AccessPoint", {})
    host_tree = payload.get("Device", {}).get("Hosts", {}).get("Host", {})

    ssid_map = {}
    if isinstance(ssid_tree, dict):
        for ssid_id, ssid_data in ssid_tree.items():
            if not isinstance(ssid_data, dict):
                continue
            lower = _value(ssid_data.get("LowerLayers", {}))
            band = "5GHz" if "Radio.2" in str(lower) else "2.4GHz" if "Radio.1" in str(lower) else "UNKNOWN"
            ssid_map[f"Device.WiFi.SSID.{ssid_id}."] = {
                "ssid": _value(ssid_data.get("SSID", {})),
                "bssid": _value(ssid_data.get("BSSID", {})),
                "band": band,
            }

    clients = []

    if isinstance(ap_tree, dict):
        for ap_id, ap in ap_tree.items():
            if not isinstance(ap, dict):
                continue
            ssid_ref = _value(ap.get("SSIDReference", {}))
            ssid = ssid_map.get(ssid_ref, {})
            assoc = ap.get("AssociatedDevice", {})
            if not isinstance(assoc, dict):
                continue
            for client_id, client in assoc.items():
                if not isinstance(client, dict):
                    continue

                mac = (
                    _value(client.get("MACAddress", {}))
                    or _value(client.get("AssociatedDeviceMACAddress", {}))
                    or _value(client.get("PhysAddress", {}))
                )
                hostname = (
                    _value(client.get("HostName", {}))
                    or _value(client.get("Hostname", {}))
                    or _value(client.get("Name", {}))
                    or "Unknown"
                )
                rssi = (
                    _value(client.get("SignalStrength", {}))
                    or _value(client.get("RSSI", {}))
                    or _value(client.get("X_TP_RSSI", {}))
                )

                if not mac and hostname == "Unknown":
                    continue

                quality = _signal_quality(rssi)
                clients.append(_infer_device_identity({
                    "source": "AssociatedDevice",
                    "hostname": hostname,
                    "mac_address": mac,
                    "ip_address": _value(client.get("IPAddress", {})) or _value(client.get("IPv4Address", {})),
                    "online": True,
                    "ssid": ssid.get("ssid"),
                    "bssid": ssid.get("bssid"),
                    "band": ssid.get("band"),
                    "rssi": _safe_int(rssi),
                    "signal_quality": quality,
                }))

    if isinstance(host_tree, dict):
        for host_id, host in host_tree.items():
            if not isinstance(host, dict):
                continue
            mac = _value(host.get("PhysAddress", {})) or _value(host.get("MACAddress", {}))
            hostname = _value(host.get("HostName", {})) or _value(host.get("Hostname", {})) or _value(host.get("Name", {})) or "Unknown"
            if not mac and hostname == "Unknown":
                continue

            clients.append(_infer_device_identity({
                "source": "Hosts",
                "hostname": hostname,
                "mac_address": mac,
                "ip_address": _value(host.get("IPAddress", {})) or _value(host.get("IPv4Address", {})),
                "online": bool(_value(host.get("Active", {}))) if _value(host.get("Active", {})) is not None else False,
                "ssid": None,
                "bssid": None,
                "band": "UNKNOWN",
                "rssi": None,
                "signal_quality": "UNKNOWN",
            }))

    # dedupe by MAC
    deduped = {}
    for c in clients:
        key = (c.get("mac_address") or f"{c.get('hostname')}-{c.get('ip_address')}").upper()
        old = deduped.get(key)
        if not old:
            deduped[key] = c
        elif c.get("online") and not old.get("online"):
            deduped[key] = {**old, **{k: v for k, v in c.items() if v not in (None, "", "UNKNOWN")}}

    devices = _apply_behavioral_fingerprinting(list(deduped.values()))
    online = [d for d in devices if d.get("online")]

    poor_signal = [d for d in online if d.get("signal_quality") == "POOR"]
    fair_signal = [d for d in online if d.get("signal_quality") == "FAIR"]

    if not online:
        wifi_score = 90
    else:
        scores = []
        for d in online:
            q = d.get("signal_quality")
            if q == "EXCELLENT":
                scores.append(100)
            elif q == "GOOD":
                scores.append(85)
            elif q == "FAIR":
                scores.append(65)
            elif q == "POOR":
                scores.append(40)
            else:
                scores.append(75)
        wifi_score = round(sum(scores) / len(scores))

    return {
        "wifi_score": wifi_score,
        "wifi_status": _status_from_score(wifi_score),
        "total_devices": len(devices),
        "online_devices": len(online),
        "poor_signal_devices": len(poor_signal),
        "fair_signal_devices": len(fair_signal),
        "devices": devices,
        "poor_signal_items": poor_signal,
    }


def _classify_technology_profile(devices):
    android = 0
    apple = 0
    smart_tvs = 0
    unknown = 0
    mobile = 0
    randomized = 0

    for d in devices:
        vendor = d.get("device_vendor")
        category = d.get("device_category")

        if vendor == "Apple":
            apple += 1
        elif vendor in ["Samsung", "OPPO", "Motorola", "Realme", "Xiaomi", "Google"]:
            android += 1
        elif vendor == "Randomized MAC":
            randomized += 1

        if category in ["SMARTPHONE", "TABLET"]:
            mobile += 1
        elif category == "SMART_TV":
            smart_tvs += 1
        elif category == "UNKNOWN":
            unknown += 1

    confidence_values = [
        d.get("behavioral_confidence")
        for d in devices
        if d.get("behavioral_confidence") is not None
    ]

    by_behavior_profile = {}
    by_device_type = {}
    identified = 0

    for d in devices:
        if d.get("identified"):
            identified += 1
        profile = d.get("behavior_profile") or "UNKNOWN"
        dtype = d.get("device_type") or "UNKNOWN"
        by_behavior_profile[profile] = by_behavior_profile.get(profile, 0) + 1
        by_device_type[dtype] = by_device_type.get(dtype, 0) + 1

    return {
        "android_devices": android,
        "apple_devices": apple,
        "smart_tvs": smart_tvs,
        "unknown_devices": unknown,
        "mobile_devices": mobile,
        "randomized_macs": randomized,
        "identified_devices": identified,
        "unidentified_devices": len(devices) - identified,
        "identity_confidence_avg": round(sum(confidence_values) / len(confidence_values), 2) if confidence_values else None,
        "by_behavior_profile": by_behavior_profile,
        "by_device_type": by_device_type,
    }


def _recommendations(internet, wifi_devices, voice, technology, care=None):
    recs = []

    if wifi_devices["poor_signal_devices"]:
        recs.append("Verificare copertura WiFi: almeno un dispositivo ha segnale scarso")
    if internet["internet_score"] < 80:
        recs.append("Verificare sessione Internet/PPP e WAN IP")
    if voice.get("has_voice") and voice.get("voip_score") is not None and voice["voip_score"] < 80:
        recs.append("Verificare provisioning SIP/VoIP")
    if technology["smart_tvs"] and wifi_devices["poor_signal_devices"]:
        recs.append("Valutare ottimizzazione WiFi per streaming/Smart TV")

    if care and care.get("open_care_events", 0) > 0:
        for event in care.get("care_events", [])[:2]:
            recommendation = event.get("recommendation")
            if recommendation and recommendation not in recs:
                recs.append(recommendation)

    if not recs:
        recs.append("Nessuna azione richiesta")

    return recs


SEVERITY_ORDER = {
    "INFO": 1,
    "LOW": 2,
    "MEDIUM": 3,
    "HIGH": 4,
    "CRITICAL": 5,
}


def _severity_rank(severity):
    return SEVERITY_ORDER.get(str(severity or "").upper(), 0)


def _serialize_care_event(row):
    return {
        "id": str(row["id"]),
        "event_code": row["event_code"],
        "severity": row["severity"],
        "category": row["category"],
        "title": row["title"],
        "description": row["description"],
        "recommendation": row["recommendation"],
        "score": row["score"],
        "status": row["status"],
        "first_detected": row["first_detected"],
        "last_detected": row["last_detected"],
        "updated_at": row["updated_at"],
    }


def _load_care_summary(db, device_id):
    rows = db.execute(
        text("""
            SELECT
                id,
                event_code,
                severity,
                category,
                title,
                description,
                recommendation,
                score,
                status,
                first_detected,
                last_detected,
                updated_at
            FROM care_events
            WHERE device_id = :device_id
              AND status = 'OPEN'
            ORDER BY
                CASE severity
                    WHEN 'CRITICAL' THEN 5
                    WHEN 'HIGH' THEN 4
                    WHEN 'MEDIUM' THEN 3
                    WHEN 'LOW' THEN 2
                    WHEN 'INFO' THEN 1
                    ELSE 0
                END DESC,
                updated_at DESC
        """),
        {"device_id": device_id},
    ).mappings().all()

    events = [_serialize_care_event(row) for row in rows]
    highest = max((event["severity"] for event in events), key=_severity_rank) if events else None

    return {
        "open_care_events": len(events),
        "highest_severity": highest,
        "care_events": events,
        "care_events_by_category": {
            category: len([event for event in events if event["category"] == category])
            for category in sorted(set(event["category"] for event in events))
        },
    }


def _build_customer360_item(row, db=None):
    payload = row["raw_acs_payload"] or {}

    acs = _extract_acs(payload)
    internet = _extract_internet(payload, row)
    voice = _extract_voice(payload, row)
    wifi_devices = _extract_wifi_and_devices(payload)
    technology = _classify_technology_profile(wifi_devices["devices"])
    care = _load_care_summary(db, row["id"]) if db is not None else {
        "open_care_events": 0,
        "highest_severity": None,
        "care_events": [],
        "care_events_by_category": {},
    }

    device_score = 100 if row["online"] else 40
    cx_score = round((
        (internet["internet_score"] or 0)
        + (wifi_devices["wifi_score"] or 0)
        + device_score
        + (voice["voip_score"] if voice.get("voip_score") is not None else 100)
    ) / 4)

    risk = _risk_from_scores(
        internet["internet_score"],
        wifi_devices["wifi_score"],
        device_score,
        voice.get("voip_score") if voice.get("voip_score") is not None else 100,
    )

    if care.get("highest_severity") in ["CRITICAL", "HIGH"]:
        risk = "HIGH"
    elif care.get("highest_severity") == "MEDIUM" and risk == "LOW":
        risk = "MEDIUM"

    recommendations = _recommendations(internet, wifi_devices, voice, technology, care)

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
        "last_seen": row["last_seen"],
        "wan_ip": internet["wan_ip"],
        "pppoe_username": row["pppoe_username"],

        "cx_score": cx_score,
        "cx_status": _status_from_score(cx_score),
        "risk_level": risk,

        "open_care_events": care.get("open_care_events", 0),
        "highest_care_severity": care.get("highest_severity"),
        "care_events_by_category": care.get("care_events_by_category", {}),
        "care_events": care.get("care_events", []),

        "internet_score": internet["internet_score"],
        "internet_status": internet["internet_status"],
        "wan_status": internet["ppp_status"],
        "last_connection_error": internet["last_connection_error"],

        "wifi_score": wifi_devices["wifi_score"],
        "wifi_status": wifi_devices["wifi_status"],
        "poor_signal_devices": wifi_devices["poor_signal_devices"],
        "fair_signal_devices": wifi_devices["fair_signal_devices"],

        "device_score": device_score,
        "device_status": _status_from_score(device_score),

        "voip_score": voice.get("voip_score"),
        "voip_status": voice.get("voip_status"),
        "has_voice": voice.get("has_voice"),
        "directory_number": voice.get("directory_number"),
        "registrar_server": voice.get("registrar_server"),

        "total_devices": wifi_devices["total_devices"],
        "online_devices": wifi_devices["online_devices"],
        "identified_devices": technology.get("identified_devices"),
        "unidentified_devices": technology.get("unidentified_devices"),
        "identity_confidence_avg": technology.get("identity_confidence_avg"),
        "behavior_profiles": technology.get("by_behavior_profile", {}),
        "device_types": technology.get("by_device_type", {}),
        "technology_profile": technology,

        "acs": acs,
        "devices": wifi_devices["devices"],
        "poor_signal_items": wifi_devices["poor_signal_items"],

        "findings": {
            "internet": internet["findings"],
            "wifi": [
                f"{wifi_devices['online_devices']} dispositivi online",
                f"{wifi_devices['poor_signal_devices']} con segnale scarso",
            ],
            "voice": [
                "VoIP non supportato" if not voice.get("has_voice") else f"VoIP {voice.get('voip_status')}"
            ],
            "care": [
                f"{care.get('open_care_events', 0)} eventi proactive care aperti",
                f"Severity massima: {care.get('highest_severity') or 'N/D'}",
            ],
            "device_identity": [
                f"{technology.get('identified_devices', 0)} dispositivi identificati",
                f"{technology.get('unidentified_devices', 0)} dispositivi non identificati",
                f"Confidence media: {technology.get('identity_confidence_avg') or 'N/D'}",
            ],
        },
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
    """


LIVE_REFRESH_OBJECTS = [
    "Device.WiFi.AccessPoint",
    "Device.WiFi.AccessPoint.*.AssociatedDevice",
    "Device.Hosts",
    "Device.WiFi.Radio",
    "Device.DeviceInfo",
    "Device.ManagementServer",
]


def _extract_last_seen_from_raw(raw):
    if not isinstance(raw, dict):
        return datetime.now(timezone.utc)

    for key in ["_lastInform", "lastInform", "_timestamp"]:
        value = raw.get(key)
        if value:
            try:
                return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            except Exception:
                pass

    return datetime.now(timezone.utc)


async def _refresh_acs_device(acs_device_id):
    client = GenieACSClient()
    task_results = []

    # GenieACS accetta refreshObject con objectName.
    # Alcuni firmware ignorano wildcard parziali: in quel caso il refresh Device resta comunque utile.
    for object_name in LIVE_REFRESH_OBJECTS:
        try:
            result = await client.create_task(
                acs_device_id,
                {
                    "name": "refreshObject",
                    "objectName": object_name,
                },
            )
            task_results.append({
                "objectName": object_name,
                "success": True,
                "result": result,
            })
        except Exception as exc:
            task_results.append({
                "objectName": object_name,
                "success": False,
                "error": str(exc),
            })

    # Diamo tempo al CPE di rispondere e a GenieACS di aggiornare il device document.
    await asyncio.sleep(5)

    raw = await client.get_device_raw(acs_device_id)
    return task_results, raw


def _update_device_raw_payload(db, device_id, raw):
    if not raw:
        return None

    last_seen = _extract_last_seen_from_raw(raw)
    db.execute(
        text("""
            UPDATE devices
            SET raw_acs_payload = CAST(:raw_payload AS JSONB),
                last_seen = :last_seen
            WHERE id = :device_id
        """),
        {
            "device_id": device_id,
            "raw_payload": json.dumps(raw),
            "last_seen": last_seen,
        },
    )
    db.commit()

    return last_seen


@router.get("/health")
async def health():
    return {"success": True, "module": "customer360"}


@router.get("/customers")
async def customer360_customers(db: Session = Depends(get_db)):
    rows = db.execute(
        text(_query_rows() + " ORDER BY c.customer_name NULLS LAST, d.model")
    ).mappings().all()

    items = [_build_customer360_item(row, db=db) for row in rows]

    average_cx = round(sum(item["cx_score"] for item in items) / len(items), 2) if items else None

    return {
        "success": True,
        "count": len(items),
        "average_cx_score": average_cx,
        "low_risk": len([item for item in items if item["risk_level"] == "LOW"]),
        "medium_risk": len([item for item in items if item["risk_level"] == "MEDIUM"]),
        "high_risk": len([item for item in items if item["risk_level"] == "HIGH"]),
        "total_devices": sum(item["total_devices"] for item in items),
        "online_devices": sum(item["online_devices"] for item in items),
        "poor_signal_devices": sum(item["poor_signal_devices"] for item in items),
        "voip_supported": len([item for item in items if item["has_voice"]]),
        "open_care_events": sum(item.get("open_care_events", 0) for item in items),
        "care_medium_or_higher": len([
            item for item in items
            if item.get("highest_care_severity") in ["MEDIUM", "HIGH", "CRITICAL"]
        ]),
        "items": items,
    }


@router.get("/customers/{device_id}")
async def customer360_customer(device_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text(_query_rows() + " WHERE d.id = :device_id LIMIT 1"),
        {"device_id": device_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Customer/device not found")

    return {
        "success": True,
        "item": _build_customer360_item(row, db=db),
    }


@router.post("/customers/{device_id}/refresh")
async def customer360_refresh_customer(device_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text(_query_rows() + " WHERE d.id = :device_id LIMIT 1"),
        {"device_id": device_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Customer/device not found")

    task_results, raw = await _refresh_acs_device(row["acs_device_id"])

    if raw:
        _update_device_raw_payload(db, device_id, raw)

    refreshed_row = db.execute(
        text(_query_rows() + " WHERE d.id = :device_id LIMIT 1"),
        {"device_id": device_id},
    ).mappings().first()

    return {
        "success": True,
        "device_id": device_id,
        "acs_device_id": row["acs_device_id"],
        "tasks": task_results,
        "raw_updated": bool(raw),
        "item": _build_customer360_item(refreshed_row, db=db) if refreshed_row else None,
    }

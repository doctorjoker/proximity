from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime
import hashlib

from app.db.session import get_db


router = APIRouter(
    prefix="/api/v1/proactive-care",
    tags=["Proactive Care"],
)


SEVERITY_ORDER = {
    "INFO": 1,
    "LOW": 2,
    "MEDIUM": 3,
    "HIGH": 4,
    "CRITICAL": 5,
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


def _severity_rank(severity):
    return SEVERITY_ORDER.get(str(severity or "").upper(), 0)


def _event_code(device_id, category, rule, unique_key):
    base = f"{device_id}:{category}:{rule}:{unique_key}"
    digest = hashlib.sha1(base.encode("utf-8")).hexdigest()[:12].upper()
    return f"{category}-{rule}-{digest}"[:64]


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
            c.id AS customer_registry_id,
            c.customer_name,
            c.customer_code,
            c.contract_number
        FROM devices d
        LEFT JOIN customer_network_links l
          ON l.device_id = d.id
        LEFT JOIN customer_registry c
          ON c.id = l.customer_registry_id
    """


def _extract_wifi_clients(payload):
    wifi = payload.get("Device", {}).get("WiFi", {})
    ssid_tree = wifi.get("SSID", {})
    ap_tree = wifi.get("AccessPoint", {})

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
                quality = _signal_quality(rssi)

                if not mac and hostname == "Unknown":
                    continue

                clients.append({
                    "ap_id": str(ap_id),
                    "client_id": str(client_id),
                    "hostname": hostname,
                    "mac_address": str(mac).upper() if mac else None,
                    "ssid": ssid.get("ssid"),
                    "bssid": ssid.get("bssid"),
                    "band": ssid.get("band"),
                    "rssi": _safe_int(rssi),
                    "signal_quality": quality,
                })

    return clients


def _extract_ppp(payload):
    ppp = (
        payload.get("Device", {})
               .get("PPP", {})
               .get("Interface", {})
               .get("1", {})
    )

    return {
        "connection_status": _value(ppp.get("ConnectionStatus", {})),
        "last_connection_error": _value(ppp.get("LastConnectionError", {})),
        "uptime": _safe_int(_value(ppp.get("Uptime", {}))),
    }


def _extract_voice(payload):
    services = payload.get("Device", {}).get("Services", {})
    voice_services = services.get("VoiceService", {})

    if not isinstance(voice_services, dict) or not voice_services:
        return {
            "has_voice": False,
            "score": None,
            "registrar": None,
            "directory_number": None,
            "auth_username": None,
        }

    def walk_find(tree, key):
        if isinstance(tree, dict):
            if key in tree:
                value = _value(tree.get(key))
                if value not in (None, ""):
                    return value
            for v in tree.values():
                found = walk_find(v, key)
                if found not in (None, ""):
                    return found
        elif isinstance(tree, list):
            for v in tree:
                found = walk_find(v, key)
                if found not in (None, ""):
                    return found
        return None

    registrar = walk_find(payload, "RegistrarServer")
    directory = walk_find(payload, "DirectoryNumber") or walk_find(payload, "URI")
    auth = walk_find(payload, "AuthUserName")

    score = 100
    if not registrar:
        score -= 20
    if not directory:
        score -= 15
    if not auth:
        score -= 15

    return {
        "has_voice": True,
        "score": max(0, min(100, score)),
        "registrar": registrar,
        "directory_number": directory,
        "auth_username": auth,
    }


def _generate_events_for_row(row):
    payload = row["raw_acs_payload"] or {}
    events = []

    customer = row["customer_name"] or row["customer_code"] or row["contract_number"] or row["acs_device_id"]
    now = datetime.utcnow()

    # Rule 1: Poor WiFi coverage.
    for client in _extract_wifi_clients(payload):
        rssi = client.get("rssi")
        if rssi is not None and rssi <= -85:
            mac = client.get("mac_address") or f"AP{client.get('ap_id')}-C{client.get('client_id')}"
            title = "Poor WiFi Coverage"
            description = (
                f"{customer}: dispositivo {mac} con segnale WiFi scarso "
                f"({rssi} dBm) su SSID {client.get('ssid') or 'N/D'} "
                f"banda {client.get('band') or 'N/D'}."
            )
            events.append({
                "event_code": _event_code(row["id"], "WIFI", "POOR_SIGNAL", mac),
                "device_id": row["id"],
                "customer_registry_id": row["customer_registry_id"],
                "severity": "MEDIUM",
                "category": "WIFI",
                "title": title,
                "description": description,
                "recommendation": "Verificare copertura WiFi, posizione CPE o eventuale mesh/repeater.",
                "score": 60,
                "first_detected": now,
                "last_detected": now,
            })

    # Rule 2: Internet instability.
    ppp = _extract_ppp(payload)
    ppp_status = ppp.get("connection_status")
    last_error = ppp.get("last_connection_error")
    if (ppp_status and str(ppp_status).lower() != "connected") or (last_error and last_error != "ERROR_NONE"):
        unique = f"{ppp_status or 'NO_STATUS'}:{last_error or 'NO_ERROR'}"
        events.append({
            "event_code": _event_code(row["id"], "INTERNET", "PPP_DEGRADED", unique),
            "device_id": row["id"],
            "customer_registry_id": row["customer_registry_id"],
            "severity": "HIGH",
            "category": "INTERNET",
            "title": "Internet Session Degraded",
            "description": f"{customer}: PPP status={ppp_status or 'N/D'}, last_error={last_error or 'N/D'}.",
            "recommendation": "Verificare sessione PPP, autenticazione RADIUS, WAN e raggiungibilita IP.",
            "score": 45,
            "first_detected": now,
            "last_detected": now,
        })

    # Rule 3: VoIP registration/provisioning failure.
    voice = _extract_voice(payload)
    if voice.get("has_voice") and voice.get("score") is not None and voice["score"] < 80:
        unique = voice.get("directory_number") or voice.get("registrar") or row["acs_device_id"]
        events.append({
            "event_code": _event_code(row["id"], "VOIP", "VOIP_DEGRADED", unique),
            "device_id": row["id"],
            "customer_registry_id": row["customer_registry_id"],
            "severity": "HIGH",
            "category": "VOIP",
            "title": "VoIP Provisioning/Registration Issue",
            "description": f"{customer}: parametri SIP incompleti o degradati.",
            "recommendation": "Verificare Registrar, Proxy, AuthUserName, DirectoryNumber e stato registrazione SIP.",
            "score": voice["score"],
            "first_detected": now,
            "last_detected": now,
        })

    # Rule 4: ACS silent/offline device.
    if not row["online"]:
        events.append({
            "event_code": _event_code(row["id"], "ACS", "DEVICE_OFFLINE", row["acs_device_id"]),
            "device_id": row["id"],
            "customer_registry_id": row["customer_registry_id"],
            "severity": "MEDIUM",
            "category": "ACS",
            "title": "ACS Silent Device",
            "description": f"{customer}: CPE offline o non raggiungibile da ACS.",
            "recommendation": "Verificare connettivita, alimentazione CPE, CWMP e ultimo inform.",
            "score": 50,
            "first_detected": now,
            "last_detected": now,
        })

    return events


def _upsert_event(db, event):
    row = db.execute(
        text("""
            INSERT INTO care_events (
                event_code,
                device_id,
                customer_registry_id,
                severity,
                category,
                title,
                description,
                recommendation,
                score,
                status,
                first_detected,
                last_detected,
                created_at,
                updated_at
            )
            VALUES (
                :event_code,
                :device_id,
                :customer_registry_id,
                :severity,
                :category,
                :title,
                :description,
                :recommendation,
                :score,
                'OPEN',
                :first_detected,
                :last_detected,
                NOW(),
                NOW()
            )
            ON CONFLICT (event_code)
            DO UPDATE SET
                severity = EXCLUDED.severity,
                category = EXCLUDED.category,
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                recommendation = EXCLUDED.recommendation,
                score = EXCLUDED.score,
                status = CASE
                    WHEN care_events.status = 'RESOLVED' THEN 'OPEN'
                    ELSE care_events.status
                END,
                last_detected = EXCLUDED.last_detected,
                updated_at = NOW()
            RETURNING *
        """),
        event,
    ).mappings().first()

    return dict(row)


def _serialize_event(row):
    return {
        "id": str(row["id"]),
        "event_code": row["event_code"],
        "device_id": str(row["device_id"]) if row["device_id"] else None,
        "customer_registry_id": str(row["customer_registry_id"]) if row["customer_registry_id"] else None,
        "severity": row["severity"],
        "category": row["category"],
        "title": row["title"],
        "description": row["description"],
        "recommendation": row["recommendation"],
        "score": row["score"],
        "status": row["status"],
        "first_detected": row["first_detected"],
        "last_detected": row["last_detected"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "customer_name": row.get("customer_name"),
        "customer_code": row.get("customer_code"),
        "contract_number": row.get("contract_number"),
        "manufacturer": row.get("manufacturer"),
        "model": row.get("model"),
        "serial_number": row.get("serial_number"),
        "acs_device_id": row.get("acs_device_id"),
    }


def _events_query():
    return """
        SELECT
            e.*,
            d.acs_device_id,
            d.manufacturer,
            d.model,
            d.serial_number,
            c.customer_name,
            c.customer_code,
            c.contract_number
        FROM care_events e
        LEFT JOIN devices d
          ON d.id = e.device_id
        LEFT JOIN customer_registry c
          ON c.id = e.customer_registry_id
    """


@router.get("/health")
async def health():
    return {"success": True, "module": "proactive-care"}


@router.post("/run")
async def run_proactive_care(db: Session = Depends(get_db)):
    rows = db.execute(
        text(_query_rows() + " ORDER BY c.customer_name NULLS LAST, d.model")
    ).mappings().all()

    generated = []
    for row in rows:
        for event in _generate_events_for_row(row):
            generated.append(_upsert_event(db, event))

    db.commit()

    return {
        "success": True,
        "devices_analyzed": len(rows),
        "events_generated": len(generated),
        "items": [_serialize_event(event) for event in generated],
    }


@router.get("/summary")
async def proactive_care_summary(db: Session = Depends(get_db)):
    rows = db.execute(
        text(_events_query() + " WHERE e.status = 'OPEN' ORDER BY e.updated_at DESC")
    ).mappings().all()

    items = [_serialize_event(row) for row in rows]

    return {
        "success": True,
        "open_events": len(items),
        "critical": len([e for e in items if e["severity"] == "CRITICAL"]),
        "high": len([e for e in items if e["severity"] == "HIGH"]),
        "medium": len([e for e in items if e["severity"] == "MEDIUM"]),
        "low": len([e for e in items if e["severity"] == "LOW"]),
        "info": len([e for e in items if e["severity"] == "INFO"]),
        "by_category": {
            category: len([e for e in items if e["category"] == category])
            for category in sorted(set(e["category"] for e in items))
        },
        "highest_severity": max((e["severity"] for e in items), key=_severity_rank) if items else None,
        "items": items,
    }


@router.get("/events")
async def proactive_care_events(
    status: str = "OPEN",
    db: Session = Depends(get_db),
):
    where = ""
    params = {}

    if status and status.upper() != "ALL":
        where = " WHERE e.status = :status"
        params["status"] = status.upper()

    rows = db.execute(
        text(_events_query() + where + " ORDER BY e.updated_at DESC"),
        params,
    ).mappings().all()

    return {
        "success": True,
        "count": len(rows),
        "items": [_serialize_event(row) for row in rows],
    }


@router.get("/customers/{device_id}")
async def proactive_care_customer(device_id: str, db: Session = Depends(get_db)):
    rows = db.execute(
        text(_events_query() + " WHERE e.device_id = :device_id ORDER BY e.updated_at DESC"),
        {"device_id": device_id},
    ).mappings().all()

    items = [_serialize_event(row) for row in rows]

    return {
        "success": True,
        "device_id": device_id,
        "open_events": len([e for e in items if e["status"] == "OPEN"]),
        "highest_severity": max((e["severity"] for e in items if e["status"] == "OPEN"), key=_severity_rank) if any(e["status"] == "OPEN" for e in items) else None,
        "items": items,
    }


@router.post("/events/{event_code}/resolve")
async def resolve_event(event_code: str, db: Session = Depends(get_db)):
    row = db.execute(
        text("""
            UPDATE care_events
            SET status = 'RESOLVED',
                updated_at = NOW()
            WHERE event_code = :event_code
            RETURNING *
        """),
        {"event_code": event_code},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Care event not found")

    db.commit()

    return {
        "success": True,
        "item": _serialize_event(dict(row)),
    }

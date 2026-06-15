from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
import json
import re

from app.db.session import get_db


router = APIRouter(
    prefix="/api/v1/voip-assurance",
    tags=["VoIP Assurance"],
)


def _value(node, default=None):
    if isinstance(node, dict):
        return node.get("_value", default)
    return default


def _first_dict(tree):
    if isinstance(tree, dict):
        for key in sorted(tree.keys(), key=lambda x: str(x)):
            if isinstance(tree[key], dict):
                return key, tree[key]
    return None, None


def _walk_dicts(tree):
    if isinstance(tree, dict):
        yield tree
        for value in tree.values():
            yield from _walk_dicts(value)
    elif isinstance(tree, list):
        for value in tree:
            yield from _walk_dicts(value)


def _find_value_deep(tree, keys, default=None):
    if isinstance(keys, str):
        keys = [keys]

    for node in _walk_dicts(tree):
        for key in keys:
            if key in node:
                value = _value(node.get(key))
                if value not in (None, ""):
                    return value

    return default


def _json_param(payload, keys, default=None):
    """
    Fallback robusto su payload serializzato.
    Alcuni TP-Link hanno i campi Voice TR-181 in zone del payload che il resolver
    gerarchico puo non intercettare correttamente. Qui cerchiamo il parametro
    per nome e leggiamo il suo _value.
    """
    if isinstance(keys, str):
        keys = [keys]

    try:
        raw = json.dumps(payload, ensure_ascii=False)
    except Exception:
        raw = str(payload)

    for key in keys:
        pattern = rf'"{re.escape(key)}"\s*:\s*\{{[^{{}}]*?"_value"\s*:\s*(".*?"|true|false|null|-?\d+(?:\.\d+)?)'
        match = re.search(pattern, raw)
        if not match:
            continue

        token = match.group(1)
        if token == "null":
            continue
        if token == "true":
            return True
        if token == "false":
            return False
        if token.startswith('"') and token.endswith('"'):
            try:
                value = json.loads(token)
            except Exception:
                value = token.strip('"')
            if value not in (None, ""):
                return value
            continue

        try:
            if "." in token:
                return float(token)
            return int(token)
        except Exception:
            return token

    return default


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


def _extract_voice(payload):
    services = payload.get("Device", {}).get("Services", {})
    voice_services = services.get("VoiceService", {})

    service_id, service = _first_dict(voice_services)
    if not service:
        return {
            "has_voice": False,
            "service_id": None,
            "profile_id": None,
            "line_id": None,
            "sip": {},
            "line": {},
            "codecs": [],
        }

    profiles = service.get("VoiceProfile", {})
    profile_id, profile = _first_dict(profiles)

    if not profile:
        return {
            "has_voice": True,
            "service_id": service_id,
            "profile_id": None,
            "line_id": None,
            "sip": {},
            "line": {},
            "codecs": [],
        }

    sip = profile.get("SIP", {}) if isinstance(profile.get("SIP", {}), dict) else {}
    lines = profile.get("Line", {})
    line_id, line = _first_dict(lines)
    if line is None:
        line = {}

    calling_features = line.get("CallingFeatures", {})
    if not isinstance(calling_features, dict):
        calling_features = {}

    line_sip = line.get("SIP", {}) if isinstance(line.get("SIP", {}), dict) else {}
    account_root = {
        "profile": profile,
        "profile_sip": sip,
        "line": line,
        "line_sip": line_sip,
    }

    registrar_server = (
        _value(sip.get("RegistrarServer", {}))
        or _value(line_sip.get("RegistrarServer", {}))
        or _find_value_deep(account_root, ["RegistrarServer", "X_TP_RegistrarServer", "Registrar"])
        or _json_param(payload, ["RegistrarServer", "X_TP_RegistrarServer", "Registrar"])
    )
    registrar_port = (
        _value(sip.get("RegistrarServerPort", {}))
        or _value(line_sip.get("RegistrarServerPort", {}))
        or _find_value_deep(account_root, ["RegistrarServerPort", "X_TP_RegistrarServerPort"])
        or _json_param(payload, ["RegistrarServerPort", "X_TP_RegistrarServerPort"])
    )
    registrar_transport = (
        _value(sip.get("RegistrarServerTransport", {}))
        or _value(line_sip.get("RegistrarServerTransport", {}))
        or _find_value_deep(account_root, ["RegistrarServerTransport", "Transport"])
        or _json_param(payload, ["RegistrarServerTransport", "Transport"])
    )

    proxy_server = (
        _value(sip.get("ProxyServer", {}))
        or _value(line_sip.get("ProxyServer", {}))
        or _find_value_deep(account_root, ["ProxyServer", "X_TP_ProxyServer", "Proxy"])
        or _json_param(payload, ["ProxyServer", "X_TP_ProxyServer", "Proxy"])
    )
    proxy_port = (
        _value(sip.get("ProxyServerPort", {}))
        or _value(line_sip.get("ProxyServerPort", {}))
        or _find_value_deep(account_root, ["ProxyServerPort", "X_TP_ProxyServerPort"])
        or _json_param(payload, ["ProxyServerPort", "X_TP_ProxyServerPort"])
    )

    outbound_proxy = (
        _value(sip.get("OutboundProxy", {}))
        or _value(line_sip.get("OutboundProxy", {}))
        or _find_value_deep(account_root, ["OutboundProxy", "OutboundProxyServer"])
        or _json_param(payload, ["OutboundProxy", "OutboundProxyServer"])
    )
    outbound_proxy_port = (
        _value(sip.get("OutboundProxyPort", {}))
        or _value(line_sip.get("OutboundProxyPort", {}))
        or _find_value_deep(account_root, ["OutboundProxyPort"])
        or _json_param(payload, ["OutboundProxyPort"])
    )

    directory_number = (
        _value(line.get("DirectoryNumber", {}))
        or _find_value_deep(line, ["DirectoryNumber", "X_TP_DirectoryNumber", "PhoneNumber", "Number"])
        or _json_param(payload, ["DirectoryNumber", "X_TP_DirectoryNumber", "PhoneNumber"])
    )
    auth_username = (
        _value(line.get("AuthUserName", {}))
        or _value(line_sip.get("AuthUserName", {}))
        or _find_value_deep(line, ["AuthUserName", "X_TP_AuthUserName", "Username", "UserName"])
        or _json_param(payload, ["AuthUserName", "X_TP_AuthUserName", "Username", "UserName"])
    )

    line_enable = _value(line.get("Enable", {}))
    if line_enable is None:
        line_enable = _find_value_deep(line, ["Enable"])

    line_status = (
        _value(line.get("Status", {}))
        or _value(line.get("LineStatus", {}))
        or _find_value_deep(line, ["Status", "LineStatus", "RegistrationStatus"])
    )

    call_state = (
        _value(line.get("CallState", {}))
        or _find_value_deep(line, ["CallState"])
    )

    codecs = []
    codec_root = line.get("Codec", {}) or profile.get("Codec", {})
    if isinstance(codec_root, dict):
        codec_list = codec_root.get("List", codec_root)
        if isinstance(codec_list, dict):
            for codec_id, codec_data in codec_list.items():
                if not isinstance(codec_data, dict):
                    continue
                name = (
                    _value(codec_data.get("Codec", {}))
                    or _value(codec_data.get("Name", {}))
                    or _value(codec_data.get("EntryID", {}))
                )
                if name not in (None, ""):
                    codecs.append({
                        "id": str(codec_id),
                        "name": name,
                        "priority": _value(codec_data.get("Priority", {})),
                        "enable": _value(codec_data.get("Enable", {})),
                    })

    return {
        "has_voice": True,
        "service_id": service_id,
        "profile_id": profile_id,
        "line_id": line_id,
        "sip": {
            "registrar_server": registrar_server,
            "registrar_port": registrar_port,
            "registrar_transport": registrar_transport,
            "proxy_server": proxy_server,
            "proxy_port": proxy_port,
            "outbound_proxy": outbound_proxy,
            "outbound_proxy_port": outbound_proxy_port,
            "user_agent_domain": _value(sip.get("UserAgentDomain", {})) or _json_param(payload, ["UserAgentDomain"]),
            "user_agent_port": _value(sip.get("UserAgentPort", {})) or _json_param(payload, ["UserAgentPort"]),
            "register_expires": _value(sip.get("RegisterExpires", {})) or _json_param(payload, ["RegisterExpires"]),
            "register_retry_interval": _value(sip.get("RegisterRetryInterval", {})) or _json_param(payload, ["RegisterRetryInterval"]),
            "registration_period": _value(sip.get("RegistrationPeriod", {})) or _json_param(payload, ["RegistrationPeriod"]),
            "dtmf_method": _value(profile.get("DTMFMethod", {})) or _json_param(payload, ["DTMFMethod"]),
            "dscp_mark": _value(sip.get("DSCPMark", {})) or _json_param(payload, ["DSCPMark"]),
        },
        "line": {
            "enable": line_enable,
            "status": line_status,
            "directory_number": directory_number,
            "auth_username": auth_username,
            "uri": _value(line.get("URI", {})) or _value(line_sip.get("URI", {})) or _json_param(payload, ["URI"]),
            "line_status": line_status,
            "call_state": call_state,
            "mwienable": _value(calling_features.get("MWIEnable", {})),
            "call_waiting_enable": _value(calling_features.get("CallWaitingEnable", {})),
        },
        "codecs": codecs,
    }


def _score_voice(row, voice, acs):
    findings = []
    recommendations = []

    if not voice.get("has_voice"):
        return {
            "voip_score": None,
            "voip_status": "NOT_SUPPORTED",
            "risk_level": "NONE",
            "findings": ["VoIP non esposto dal CPE"],
            "recommendations": ["Nessuna azione richiesta per router solo dati"],
        }

    score = 100
    line = voice.get("line", {})
    sip = voice.get("sip", {})

    enable = line.get("enable")
    status = line.get("status") or line.get("line_status")
    directory = line.get("directory_number")
    auth_username = line.get("auth_username")
    registrar = sip.get("registrar_server")
    proxy = sip.get("proxy_server")

    if enable is False:
        score -= 35
        findings.append("Linea VoIP disabilitata")
        recommendations.append("Abilitare la linea VoIP se il servizio deve essere attivo")

    if status and str(status).lower() not in ["up", "enabled", "registered", "idle", "registering"]:
        score -= 30
        findings.append(f"Stato linea VoIP non ottimale ({status})")
        recommendations.append("Verificare registrazione SIP e configurazione linea")

    if not registrar:
        score -= 20
        findings.append("Registrar SIP non rilevato")
        recommendations.append("Configurare o verificare RegistrarServer SIP")

    if not proxy:
        findings.append("Proxy SIP non rilevato")

    if not directory:
        score -= 15
        findings.append("Numero VoIP/DirectoryNumber non rilevato")
        recommendations.append("Verificare provisioning numero VoIP")

    if not auth_username:
        score -= 15
        findings.append("AuthUserName SIP non rilevato")
        recommendations.append("Verificare credenziali SIP")

    if not acs.get("acs_online"):
        score -= 15
        findings.append("ACS/CWMP non confermato")
        recommendations.append("Verificare ManagementServer e periodic inform")

    if not row["online"]:
        score -= 40
        findings.append("Router offline")
        recommendations.append("Verificare connettivita CPE")

    if registrar and directory and auth_username:
        findings.append("Linea VoIP configurata")
        if proxy:
            findings.append("Proxy SIP configurato")

    if not findings:
        findings.append("VoIP stabile")
    if not recommendations:
        recommendations.append("Nessuna azione richiesta")

    score = max(0, min(100, score))

    if score >= 90:
        voip_status = "OK"
        risk_level = "LOW"
    elif score >= 70:
        voip_status = "DEGRADED"
        risk_level = "MEDIUM"
    else:
        voip_status = "CRITICAL"
        risk_level = "HIGH"

    return {
        "voip_score": score,
        "voip_status": voip_status,
        "risk_level": risk_level,
        "findings": findings,
        "recommendations": recommendations,
    }


def _build_item(row):
    payload = row["raw_acs_payload"] or {}
    acs = _extract_acs(payload)
    voice = _extract_voice(payload)
    score = _score_voice(row, voice, acs)

    sip = voice.get("sip", {})
    line = voice.get("line", {})

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

        "has_voice": voice.get("has_voice"),
        "voice_service_id": voice.get("service_id"),
        "voice_profile_id": voice.get("profile_id"),
        "line_id": voice.get("line_id"),

        "voip_score": score["voip_score"],
        "voip_status": score["voip_status"],
        "risk_level": score["risk_level"],
        "findings": score["findings"],
        "recommendations": score["recommendations"],

        "line_enable": line.get("enable"),
        "line_status": line.get("status") or line.get("line_status"),
        "directory_number": line.get("directory_number"),
        "auth_username": line.get("auth_username"),
        "sip_uri": line.get("uri"),
        "call_state": line.get("call_state"),
        "call_waiting_enable": line.get("call_waiting_enable"),
        "mwi_enable": line.get("mwienable"),

        "registrar_server": sip.get("registrar_server"),
        "registrar_port": sip.get("registrar_port"),
        "registrar_transport": sip.get("registrar_transport"),
        "proxy_server": sip.get("proxy_server"),
        "proxy_port": sip.get("proxy_port"),
        "outbound_proxy": sip.get("outbound_proxy"),
        "outbound_proxy_port": sip.get("outbound_proxy_port"),
        "register_expires": sip.get("register_expires"),
        "register_retry_interval": sip.get("register_retry_interval"),
        "registration_period": sip.get("registration_period"),
        "dtmf_method": sip.get("dtmf_method"),
        "dscp_mark": sip.get("dscp_mark"),

        "codecs": voice.get("codecs", []),

        "acs_online": acs.get("acs_online"),
        "acs_url": acs.get("acs_url"),
        "periodic_inform_enabled": acs.get("periodic_inform_enabled"),
        "periodic_inform_interval": acs.get("periodic_inform_interval"),
        "connection_request_url": acs.get("connection_request_url"),
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
    return {"success": True, "module": "voip-assurance"}


@router.get("/devices/{device_id}")
async def voip_assurance_device(device_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text(_query_rows() + " WHERE d.id = :device_id LIMIT 1"),
        {"device_id": device_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Device not found")

    return {"success": True, "item": _build_item(row)}


@router.get("/summary")
async def voip_assurance_summary(db: Session = Depends(get_db)):
    rows = db.execute(
        text(_query_rows() + " ORDER BY c.customer_name NULLS LAST, d.model")
    ).mappings().all()

    items = [_build_item(row) for row in rows]
    supported = [item for item in items if item["has_voice"]]
    scored = [item for item in supported if item["voip_score"] is not None]

    average = round(sum(item["voip_score"] for item in scored) / len(scored), 2) if scored else None

    return {
        "success": True,
        "devices": len(items),
        "voice_supported": len(supported),
        "voice_not_supported": len(items) - len(supported),
        "average_voip_score": average,
        "ok": len([item for item in supported if item["voip_status"] == "OK"]),
        "degraded": len([item for item in supported if item["voip_status"] == "DEGRADED"]),
        "critical": len([item for item in supported if item["voip_status"] == "CRITICAL"]),
        "risk_low": len([item for item in supported if item["risk_level"] == "LOW"]),
        "risk_medium": len([item for item in supported if item["risk_level"] == "MEDIUM"]),
        "risk_high": len([item for item in supported if item["risk_level"] == "HIGH"]),
        "items": items,
    }

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db


router = APIRouter(
    prefix="/api/v1/internet-experience",
    tags=["Internet Experience"],
)


def _value(node, default=None):
    if isinstance(node, dict):
        return node.get("_value", default)
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


def _extract_device(payload):
    devinfo = payload.get("Device", {}).get("DeviceInfo", {})
    uptime = _value(devinfo.get("UpTime", {}))
    try:
        uptime = int(uptime) if uptime is not None else None
    except Exception:
        uptime = None
    return {"uptime_seconds": uptime}


def _extract_ppp(payload):
    ppp_interfaces = payload.get("Device", {}).get("PPP", {}).get("Interface", {})
    if not isinstance(ppp_interfaces, dict):
        return {
            "ppp_interface_id": None,
            "ppp_ref": None,
            "connection_status": None,
            "connection_trigger": None,
            "last_connection_error": None,
            "authentication_protocol": None,
            "username": None,
            "dns_servers": [],
        }

    selected_id = None
    selected = None

    for iface_id, iface_data in ppp_interfaces.items():
        if not isinstance(iface_data, dict):
            continue
        status = _value(iface_data.get("ConnectionStatus", {}))
        enabled = _value(iface_data.get("Enable", {}), True)
        if status == "Connected" or enabled is True:
            selected_id = iface_id
            selected = iface_data
            break

    if selected is None:
        for iface_id, iface_data in ppp_interfaces.items():
            if isinstance(iface_data, dict):
                selected_id = iface_id
                selected = iface_data
                break

    if selected is None:
        return {
            "ppp_interface_id": None,
            "ppp_ref": None,
            "connection_status": None,
            "connection_trigger": None,
            "last_connection_error": None,
            "authentication_protocol": None,
            "username": None,
            "dns_servers": [],
        }

    dns_servers = []
    ipcp_tree = selected.get("IPCP", {})
    if isinstance(ipcp_tree, dict):
        for _, ipcp in ipcp_tree.items():
            if not isinstance(ipcp, dict):
                continue
            dns_value = _value(ipcp.get("DNSServer", {}), "")
            if dns_value:
                dns_servers.extend([x.strip() for x in str(dns_value).split(",") if x.strip()])

    return {
        "ppp_interface_id": selected_id,
        "ppp_ref": f"Device.PPP.Interface.{selected_id}.",
        "connection_status": _value(selected.get("ConnectionStatus", {})),
        "connection_trigger": _value(selected.get("ConnectionTrigger", {})),
        "last_connection_error": _value(selected.get("LastConnectionError", {})),
        "authentication_protocol": _value(selected.get("AuthenticationProtocol", {})),
        "username": _value(selected.get("Username", {})),
        "dns_servers": dns_servers,
    }


def _extract_ip_interface(payload, ppp_ref):
    ip_interfaces = payload.get("Device", {}).get("IP", {}).get("Interface", {})
    if not isinstance(ip_interfaces, dict):
        return {
            "ip_interface_id": None,
            "ip_interface_ref": None,
            "ipv4_status": None,
            "ipv6_status": None,
            "ipv4_address": None,
            "ipv6_address": None,
        }

    for iface_id, iface in ip_interfaces.items():
        if not isinstance(iface, dict):
            continue

        if _value(iface.get("LowerLayers", {}), "") != ppp_ref:
            continue

        ipv4_address = None
        ipv4_tree = iface.get("IPv4Address", {})
        if isinstance(ipv4_tree, dict):
            for _, address_data in ipv4_tree.items():
                if isinstance(address_data, dict):
                    ip = _value(address_data.get("IPAddress", {}))
                    if ip:
                        ipv4_address = ip
                        break

        ipv6_address = None
        ipv6_tree = iface.get("IPv6Address", {})
        if isinstance(ipv6_tree, dict):
            for _, address_data in ipv6_tree.items():
                if isinstance(address_data, dict):
                    ip = _value(address_data.get("IPAddress", {}))
                    if ip:
                        ipv6_address = ip
                        break

        return {
            "ip_interface_id": iface_id,
            "ip_interface_ref": f"Device.IP.Interface.{iface_id}.",
            "ipv4_status": _value(iface.get("IPv4Status", {})),
            "ipv6_status": _value(iface.get("IPv6Status", {})),
            "ipv4_address": ipv4_address,
            "ipv6_address": ipv6_address,
        }

    return {
        "ip_interface_id": None,
        "ip_interface_ref": None,
        "ipv4_status": None,
        "ipv6_status": None,
        "ipv4_address": None,
        "ipv6_address": None,
    }


def _status_from_score(score):
    if score >= 95:
        return "EXCELLENT"
    if score >= 80:
        return "GOOD"
    if score >= 60:
        return "WARNING"
    return "CRITICAL"


def _risk_from_score(score):
    if score >= 80:
        return "LOW"
    if score >= 60:
        return "MEDIUM"
    return "HIGH"


def _build_score(row, ppp, ip_iface, acs, device):
    score = 100
    findings = []
    recommendations = []

    wan_ip = row["wan_ip"] or ip_iface.get("ipv4_address")
    ppp_status = ppp.get("connection_status")
    last_error = ppp.get("last_connection_error")
    uptime = device.get("uptime_seconds")

    if not row["online"]:
        score -= 40
        findings.append("Router offline")
        recommendations.append("Verificare alimentazione CPE e raggiungibilita ACS")

    if ppp_status != "Connected":
        score -= 35
        findings.append(f"PPP non connesso ({ppp_status or 'N/D'})")
        recommendations.append("Verificare sessione PPPoE, profilo utente e accesso rete")

    if last_error and last_error != "ERROR_NONE":
        score -= 20
        findings.append(f"Errore PPP rilevato ({last_error})")
        recommendations.append("Controllare credenziali PPPoE e configurazione BRAS/RADIUS")

    if not wan_ip:
        score -= 25
        findings.append("WAN IP assente")
        recommendations.append("Verificare assegnazione IP e stato accesso")

    if not acs.get("acs_online"):
        score -= 20
        findings.append("ACS non confermato online")
        recommendations.append("Verificare configurazione ManagementServer e periodic inform")

    inform_interval = acs.get("periodic_inform_interval")
    try:
        inform_interval_int = int(inform_interval) if inform_interval is not None else None
    except Exception:
        inform_interval_int = None

    if inform_interval_int is not None and inform_interval_int > 3600:
        score -= 10
        findings.append("Periodic inform troppo alto")
        recommendations.append("Ridurre intervallo inform per assurance realtime")

    if uptime is not None:
        if uptime < 3600:
            score -= 10
            findings.append("Uptime basso: possibile riavvio recente")
            recommendations.append("Monitorare stabilita CPE")
        elif uptime >= 86400 * 7:
            findings.append("Sessione stabile da oltre 7 giorni")
        elif uptime >= 86400:
            findings.append("Sessione stabile da oltre 24 ore")

    if not findings:
        findings.append("Esperienza Internet stabile")
    if not recommendations:
        recommendations.append("Nessuna azione richiesta")

    score = max(0, min(100, score))

    return {
        "internet_score": score,
        "internet_status": _status_from_score(score),
        "risk_level": _risk_from_score(score),
        "findings": findings,
        "recommendations": recommendations,
    }


def _build_item(row):
    payload = row["raw_acs_payload"] or {}
    acs = _extract_acs(payload)
    device = _extract_device(payload)
    ppp = _extract_ppp(payload)
    ip_iface = _extract_ip_interface(payload, ppp.get("ppp_ref"))

    score = _build_score(row, ppp, ip_iface, acs, device)

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
        "wan_ip": row["wan_ip"] or ip_iface.get("ipv4_address"),
        "pppoe_username": row["pppoe_username"] or ppp.get("username"),

        "internet_score": score["internet_score"],
        "internet_status": score["internet_status"],
        "risk_level": score["risk_level"],
        "findings": score["findings"],
        "recommendations": score["recommendations"],

        "ppp_status": ppp.get("connection_status"),
        "connection_trigger": ppp.get("connection_trigger"),
        "last_connection_error": ppp.get("last_connection_error"),
        "authentication_protocol": ppp.get("authentication_protocol"),
        "ppp_ref": ppp.get("ppp_ref"),

        "ip_interface_ref": ip_iface.get("ip_interface_ref"),
        "ipv4_status": ip_iface.get("ipv4_status"),
        "ipv6_status": ip_iface.get("ipv6_status"),
        "ipv4_address": ip_iface.get("ipv4_address"),
        "ipv6_address": ip_iface.get("ipv6_address"),
        "dns_servers": ppp.get("dns_servers", []),

        "acs_online": acs.get("acs_online"),
        "acs_url": acs.get("acs_url"),
        "periodic_inform_enabled": acs.get("periodic_inform_enabled"),
        "periodic_inform_interval": acs.get("periodic_inform_interval"),
        "connection_request_url": acs.get("connection_request_url"),

        "session_uptime_seconds": device.get("uptime_seconds"),
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
    return {"success": True, "module": "internet-experience"}


@router.get("/devices/{device_id}")
async def internet_experience_device(device_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text(_query_rows() + " WHERE d.id = :device_id LIMIT 1"),
        {"device_id": device_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Device not found")

    return {"success": True, "item": _build_item(row)}


@router.get("/summary")
async def internet_experience_summary(db: Session = Depends(get_db)):
    rows = db.execute(
        text(_query_rows() + " ORDER BY c.customer_name NULLS LAST, d.model")
    ).mappings().all()

    items = [_build_item(row) for row in rows]
    average = round(sum(item["internet_score"] for item in items) / len(items), 2) if items else None

    return {
        "success": True,
        "devices": len(items),
        "average_internet_score": average,
        "excellent": len([item for item in items if item["internet_status"] == "EXCELLENT"]),
        "good": len([item for item in items if item["internet_status"] == "GOOD"]),
        "warning": len([item for item in items if item["internet_status"] == "WARNING"]),
        "critical": len([item for item in items if item["internet_status"] == "CRITICAL"]),
        "risk_low": len([item for item in items if item["risk_level"] == "LOW"]),
        "risk_medium": len([item for item in items if item["risk_level"] == "MEDIUM"]),
        "risk_high": len([item for item in items if item["risk_level"] == "HIGH"]),
        "connected": len([item for item in items if item["ppp_status"] == "Connected"]),
        "items": items,
    }

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db


router = APIRouter(
    prefix="/api/v1/wan-assurance",
    tags=["WAN Assurance"],
)


def _value(node, default=None):
    if isinstance(node, dict):
        return node.get("_value", default)
    return default


def _find_first_dict_with_key(tree, key):
    if isinstance(tree, dict):
        if key in tree:
            return tree

        for value in tree.values():
            found = _find_first_dict_with_key(value, key)
            if found is not None:
                return found

    elif isinstance(tree, list):
        for value in tree:
            found = _find_first_dict_with_key(value, key)
            if found is not None:
                return found

    return None


def _find_ip_interface_linked_to_ppp(payload, ppp_ref="Device.PPP.Interface.1."):
    ip_interfaces = (
        payload.get("Device", {})
               .get("IP", {})
               .get("Interface", {})
    )

    if not isinstance(ip_interfaces, dict):
        return None, None

    for iface_id, iface_data in ip_interfaces.items():
        if not isinstance(iface_data, dict):
            continue

        lower_layers = _value(iface_data.get("LowerLayers", {}), "")
        if lower_layers == ppp_ref:
            return iface_id, iface_data

    return None, None


def _extract_ppp(payload):
    ppp_interfaces = (
        payload.get("Device", {})
               .get("PPP", {})
               .get("Interface", {})
    )

    if not isinstance(ppp_interfaces, dict):
        return {
            "ppp_interface_id": None,
            "ppp_ref": None,
            "connection_status": None,
            "connection_trigger": None,
            "last_connection_error": None,
            "username": None,
            "authentication_protocol": None,
            "dns_servers": [],
        }

    selected_id = None
    selected = None

    # Prefer the first enabled/connected PPP interface.
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
            "username": None,
            "authentication_protocol": None,
            "dns_servers": [],
        }

    ppp_ref = f"Device.PPP.Interface.{selected_id}."

    # TP-Link usually exposes DNS under PPP.Interface.{id}.IPCP.{n}.DNSServer.
    dns_servers = []
    ipcp_tree = selected.get("IPCP", {})
    if isinstance(ipcp_tree, dict):
        for _, ipcp_data in ipcp_tree.items():
            if not isinstance(ipcp_data, dict):
                continue
            dns_value = _value(ipcp_data.get("DNSServer", {}), "")
            if dns_value:
                dns_servers.extend([
                    item.strip()
                    for item in str(dns_value).split(",")
                    if item.strip()
                ])

    return {
        "ppp_interface_id": selected_id,
        "ppp_ref": ppp_ref,
        "connection_status": _value(selected.get("ConnectionStatus", {})),
        "connection_trigger": _value(selected.get("ConnectionTrigger", {})),
        "last_connection_error": _value(selected.get("LastConnectionError", {})),
        "username": _value(selected.get("Username", {})),
        "authentication_protocol": _value(selected.get("AuthenticationProtocol", {})),
        "dns_servers": dns_servers,
    }


def _extract_ip_interface(payload, ppp_ref):
    iface_id, iface = _find_ip_interface_linked_to_ppp(payload, ppp_ref)

    if iface is None:
        return {
            "ip_interface_id": None,
            "ip_interface_ref": None,
            "ipv4_status": None,
            "ipv6_status": None,
            "lower_layers": None,
            "ipv4_address": None,
            "ipv6_address": None,
        }

    ipv4_address = None
    ipv4_tree = iface.get("IPv4Address", {})
    if isinstance(ipv4_tree, dict):
        for _, address_data in ipv4_tree.items():
            if not isinstance(address_data, dict):
                continue
            ip = _value(address_data.get("IPAddress", {}))
            if ip:
                ipv4_address = ip
                break

    ipv6_address = None
    ipv6_tree = iface.get("IPv6Address", {})
    if isinstance(ipv6_tree, dict):
        for _, address_data in ipv6_tree.items():
            if not isinstance(address_data, dict):
                continue
            ip = _value(address_data.get("IPAddress", {}))
            if ip:
                ipv6_address = ip
                break

    return {
        "ip_interface_id": iface_id,
        "ip_interface_ref": f"Device.IP.Interface.{iface_id}.",
        "ipv4_status": _value(iface.get("IPv4Status", {})),
        "ipv6_status": _value(iface.get("IPv6Status", {})),
        "lower_layers": _value(iface.get("LowerLayers", {})),
        "ipv4_address": ipv4_address,
        "ipv6_address": ipv6_address,
    }


def _extract_acs(payload):
    mgmt = (
        payload.get("Device", {})
               .get("ManagementServer", {})
    )

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


def _wan_risk(row, ppp, ip_iface, acs):
    risk_score = 0
    findings = []
    recommendations = []

    connection_status = ppp.get("connection_status")
    last_error = ppp.get("last_connection_error")
    wan_ip = row["wan_ip"] or ip_iface.get("ipv4_address")

    if not row["online"]:
        risk_score += 40
        findings.append("Router offline")
        recommendations.append("Verificare alimentazione, linea e raggiungibilita ACS")

    if connection_status and connection_status != "Connected":
        risk_score += 35
        findings.append(f"Connessione WAN non connessa ({connection_status})")
        recommendations.append("Verificare sessione PPPoE/WAN sul router")

    if last_error and last_error != "ERROR_NONE":
        risk_score += 30
        findings.append(f"Errore WAN rilevato ({last_error})")
        recommendations.append("Verificare autenticazione PPPoE e configurazione accesso")

    if not wan_ip:
        risk_score += 20
        findings.append("WAN IP assente")
        recommendations.append("Verificare assegnazione IP lato accesso/BRAS")

    if not acs.get("acs_online"):
        risk_score += 15
        findings.append("ACS/CWMP non confermato")
        recommendations.append("Verificare ManagementServer e periodic inform")

    if not ppp.get("username") and not row["pppoe_username"]:
        risk_score += 10
        findings.append("Username PPPoE non rilevato")
        recommendations.append("Verificare parametri PPPoE del CPE")

    if not findings:
        findings.append("WAN stabile")
    if not recommendations:
        recommendations.append("Nessuna azione richiesta")

    risk_score = max(0, min(100, risk_score))

    if risk_score <= 20:
        risk_level = "LOW"
    elif risk_score <= 50:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    return risk_score, risk_level, findings, recommendations


def _build_item(row):
    payload = row["raw_acs_payload"] or {}

    ppp = _extract_ppp(payload)
    ip_iface = _extract_ip_interface(payload, ppp.get("ppp_ref"))
    acs = _extract_acs(payload)

    risk_score, risk_level, findings, recommendations = _wan_risk(
        row=row,
        ppp=ppp,
        ip_iface=ip_iface,
        acs=acs,
    )

    wan_ip = row["wan_ip"] or ip_iface.get("ipv4_address")

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

        "wan_status": "CONNECTED" if ppp.get("connection_status") == "Connected" and wan_ip else "DEGRADED",
        "wan_ip": wan_ip,
        "pppoe_username": row["pppoe_username"] or ppp.get("username"),

        "ppp_interface_id": ppp.get("ppp_interface_id"),
        "ppp_ref": ppp.get("ppp_ref"),
        "connection_status": ppp.get("connection_status"),
        "connection_trigger": ppp.get("connection_trigger"),
        "last_connection_error": ppp.get("last_connection_error"),
        "authentication_protocol": ppp.get("authentication_protocol"),

        "ip_interface_id": ip_iface.get("ip_interface_id"),
        "ip_interface_ref": ip_iface.get("ip_interface_ref"),
        "ipv4_status": ip_iface.get("ipv4_status"),
        "ipv6_status": ip_iface.get("ipv6_status"),
        "lower_layers": ip_iface.get("lower_layers"),
        "ipv4_address": ip_iface.get("ipv4_address"),
        "ipv6_address": ip_iface.get("ipv6_address"),

        "dns_servers": ppp.get("dns_servers", []),

        "acs_online": acs.get("acs_online"),
        "acs_url": acs.get("acs_url"),
        "periodic_inform_enabled": acs.get("periodic_inform_enabled"),
        "periodic_inform_interval": acs.get("periodic_inform_interval"),
        "connection_request_url": acs.get("connection_request_url"),

        "risk_score": risk_score,
        "risk_level": risk_level,
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


@router.get("/health")
async def wan_assurance_health():
    return {
        "success": True,
        "module": "wan-assurance",
    }


@router.get("/devices/{device_id}")
async def wan_assurance_device(
    device_id: str,
    db: Session = Depends(get_db),
):
    row = db.execute(
        text(_query_rows() + """
            WHERE d.id = :device_id
            LIMIT 1
        """),
        {
            "device_id": device_id,
        },
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Device not found")

    return {
        "success": True,
        "item": _build_item(row),
    }


@router.get("/summary")
async def wan_assurance_summary(
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text(_query_rows() + """
            ORDER BY c.customer_name NULLS LAST, d.last_seen DESC NULLS LAST
        """)
    ).mappings().all()

    items = [_build_item(row) for row in rows]

    return {
        "success": True,
        "devices": len(items),
        "connected": len([
            item for item in items
            if item["wan_status"] == "CONNECTED"
        ]),
        "degraded": len([
            item for item in items
            if item["wan_status"] != "CONNECTED"
        ]),
        "risk_low": len([
            item for item in items
            if item["risk_level"] == "LOW"
        ]),
        "risk_medium": len([
            item for item in items
            if item["risk_level"] == "MEDIUM"
        ]),
        "risk_high": len([
            item for item in items
            if item["risk_level"] == "HIGH"
        ]),
        "items": items,
    }

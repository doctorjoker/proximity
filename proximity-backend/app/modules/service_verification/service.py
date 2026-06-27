from app.modules.device_authority.service import assert_device_authorized
from app.modules.desired_config.repository import list_desired_configs
from app.services.genieacs import genieacs_client


def _get_value(obj, path, default=None):
    current = obj

    try:
        for key in path:
            current = current[key]

        if isinstance(current, dict) and "_value" in current:
            return current["_value"]

        return current

    except Exception:
        return default


def _desired_by_type(configs):
    result = {}

    for cfg in configs:
        result[cfg["config_type"]] = cfg["configuration"]

    return result


async def verify_customer_service(
    service_code: str,
    acs_device_id: str,
):
    auth = assert_device_authorized(
        service_code,
        acs_device_id,
    )

    if not auth["authorized"]:
        return {
            "success": False,
            "service_code": service_code,
            "acs_device_id": acs_device_id,
            "state": "NOT_AUTHORIZED",
            "reason": auth["reason"],
        }

    configs = list_desired_configs(service_code)
    desired = _desired_by_type(configs)

    device = await genieacs_client.get_device_raw(acs_device_id)

    verification = {
        "pppoe": {
            "configured": False,
            "connected": False,
        },
        "wifi": {
            "configured": False,
        },
        "voip": {
            "configured": False,
            "registered": False,
        },
    }

    # PPPoE
    if "PPPOE" in desired:
        expected_username = desired["PPPOE"].get("username")

        actual_username = _get_value(
            device,
            [
                "InternetGatewayDevice",
                "WANDevice",
                "1",
                "WANConnectionDevice",
                "4",
                "WANPPPConnection",
                "1",
                "Username",
            ],
        )

        connection_status = _get_value(
            device,
            [
                "InternetGatewayDevice",
                "WANDevice",
                "1",
                "WANConnectionDevice",
                "4",
                "WANPPPConnection",
                "1",
                "ConnectionStatus",
            ],
        )

        external_ip = _get_value(
            device,
            [
                "InternetGatewayDevice",
                "WANDevice",
                "1",
                "WANConnectionDevice",
                "4",
                "WANPPPConnection",
                "1",
                "ExternalIPAddress",
            ],
        )

        verification["pppoe"] = {
            "configured": actual_username == expected_username,
            "connected": connection_status == "Connected",
            "expected_username": expected_username,
            "actual_username": actual_username,
            "connection_status": connection_status,
            "external_ip": external_ip,
        }

    # WiFi
    if "WIFI" in desired:
        expected_ssid_24 = desired["WIFI"].get("ssid_24")
        expected_ssid_5 = desired["WIFI"].get("ssid_5")

        actual_ssid_24 = _get_value(
            device,
            [
                "InternetGatewayDevice",
                "LANDevice",
                "1",
                "WLANConfiguration",
                "1",
                "SSID",
            ],
        )

        actual_ssid_5 = _get_value(
            device,
            [
                "InternetGatewayDevice",
                "LANDevice",
                "1",
                "WLANConfiguration",
                "3",
                "SSID",
            ],
        )

        wifi24_enabled = _get_value(
            device,
            [
                "InternetGatewayDevice",
                "LANDevice",
                "1",
                "WLANConfiguration",
                "1",
                "Enable",
            ],
        )

        wifi5_enabled = _get_value(
            device,
            [
                "InternetGatewayDevice",
                "LANDevice",
                "1",
                "WLANConfiguration",
                "3",
                "Enable",
            ],
        )

        verification["wifi"] = {
            "configured": (
                actual_ssid_24 == expected_ssid_24
                and actual_ssid_5 == expected_ssid_5
            ),
            "ssid24": actual_ssid_24,
            "ssid5": actual_ssid_5,
            "expected_ssid24": expected_ssid_24,
            "expected_ssid5": expected_ssid_5,
            "wifi24_enabled": wifi24_enabled,
            "wifi5_enabled": wifi5_enabled,
        }

    # VoIP
    if "VOIP" in desired:
        expected_number = desired["VOIP"].get("number")
        expected_username = desired["VOIP"].get("username")
        expected_registrar = desired["VOIP"].get("registrar")

        actual_number = _get_value(
            device,
            [
                "Device",
                "X_TP_Services",
                "X_TP_VoiceService",
                "1",
                "VoiceProfile",
                "1",
                "MultiIsp",
                "1",
                "MultiVoipNum",
            ],
        )

        actual_username = _get_value(
            device,
            [
                "Device",
                "X_TP_Services",
                "X_TP_VoiceService",
                "1",
                "VoiceProfile",
                "1",
                "MultiIsp",
                "1",
                "MultiAuthUserName",
            ],
        )

        actual_registrar = _get_value(
            device,
            [
                "Device",
                "X_TP_Services",
                "X_TP_VoiceService",
                "1",
                "VoiceProfile",
                "1",
                "MultiIsp",
                "1",
                "MultiRegistrarServer",
            ],
        )

        account_enabled = _get_value(
            device,
            [
                "Device",
                "X_TP_Services",
                "X_TP_VoiceService",
                "1",
                "VoiceProfile",
                "1",
                "MultiIsp",
                "1",
                "MultiAccountEnable",
            ],
        )

        verification["voip"] = {
            "configured": (
                actual_number == expected_number
                and actual_username == expected_username
                and actual_registrar == expected_registrar
                and account_enabled == 1
            ),
            # Nota: su XC220-G3v MultiStatus/Line.Status non sono affidabili.
            # Per ora "registered" viene derivato dalla presenza config runtime.
            # In futuro va collegato a FreePBX/Asterisk o a un parametro runtime più affidabile.
            "registered": (
                actual_number == expected_number
                and actual_username == expected_username
                and actual_registrar == expected_registrar
                and account_enabled == 1
            ),
            "number": actual_number,
            "username": actual_username,
            "registrar": actual_registrar,
            "account_enabled": account_enabled,
        }

    all_configured = (
        verification["pppoe"]["configured"]
        and verification["wifi"]["configured"]
        and verification["voip"]["configured"]
    )

    state = "SERVICE_OPERATIONAL" if all_configured else "SERVICE_DEGRADED"

    return {
        "success": True,
        "service_code": service_code,
        "acs_device_id": acs_device_id,
        "state": state,
        "verification": verification,
    }

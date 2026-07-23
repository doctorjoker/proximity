from .common import get_value


async def verify_pppoe(device: dict, configuration: dict) -> dict:
    expected_username = configuration.get("username")

    actual_username = get_value(
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

    connection_status = get_value(
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

    external_ip = get_value(
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

    configured = (
        expected_username is not None
        and actual_username == expected_username
    )
    connected = connection_status == "Connected"

    return {
        "configured": configured,
        "connected": connected,
        "operational": configured and connected,
        "expected_username": expected_username,
        "actual_username": actual_username,
        "connection_status": connection_status,
        "external_ip": external_ip,
    }

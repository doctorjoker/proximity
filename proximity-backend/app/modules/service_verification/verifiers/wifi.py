from .common import get_value


async def verify_wifi(device: dict, configuration: dict) -> dict:
    expected_ssid_24 = configuration.get("ssid_24")
    expected_ssid_5 = configuration.get("ssid_5")

    actual_ssid_24 = get_value(
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

    actual_ssid_5 = get_value(
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

    wifi24_enabled = get_value(
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

    wifi5_enabled = get_value(
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

    configured = (
        expected_ssid_24 is not None
        and expected_ssid_5 is not None
        and actual_ssid_24 == expected_ssid_24
        and actual_ssid_5 == expected_ssid_5
    )

    enabled = wifi24_enabled in (True, 1, "1") and wifi5_enabled in (True, 1, "1")

    return {
        "configured": configured,
        "enabled": enabled,
        "operational": configured and enabled,
        "ssid24": actual_ssid_24,
        "ssid5": actual_ssid_5,
        "expected_ssid24": expected_ssid_24,
        "expected_ssid5": expected_ssid_5,
        "wifi24_enabled": wifi24_enabled,
        "wifi5_enabled": wifi5_enabled,
    }

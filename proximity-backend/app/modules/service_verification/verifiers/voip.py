from .common import get_value


async def verify_voip(device: dict, configuration: dict) -> dict:
    expected_number = configuration.get("number")
    expected_username = configuration.get("username")
    expected_registrar = configuration.get("registrar")

    actual_number = get_value(
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

    actual_username = get_value(
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

    actual_registrar = get_value(
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

    account_enabled = get_value(
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

    configured = (
        expected_number is not None
        and expected_username is not None
        and expected_registrar is not None
        and actual_number == expected_number
        and actual_username == expected_username
        and actual_registrar == expected_registrar
        and account_enabled in (True, 1, "1")
    )

    return {
        "configured": configured,
        # XC220-G3v non espone uno stato SIP affidabile: per ora deriva dalla config runtime.
        "registered": configured,
        "operational": configured,
        "number": actual_number,
        "username": actual_username,
        "registrar": actual_registrar,
        "account_enabled": account_enabled,
    }

from .repository import get_assigned_device


def assert_device_authorized(
    service_code: str,
    acs_device_id: str
):
    device = get_assigned_device(
        service_code,
        acs_device_id
    )

    if not device:
        return {
            "authorized": False,
            "reason": "DEVICE_NOT_ASSIGNED"
        }

    if not device["provisioning_allowed"]:
        return {
            "authorized": False,
            "reason": "PROVISIONING_DISABLED"
        }

    if device["assignment_status"] != "ASSIGNED":
        return {
            "authorized": False,
            "reason": "DEVICE_NOT_ACTIVE"
        }

    return {
        "authorized": True,
        "device": device
    }

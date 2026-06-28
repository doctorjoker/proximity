from .repository import get_assigned_device, replace_assigned_device


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

def replace_authorized_device(
    service_code: str,
    old_acs_device_id: str,
    new_acs_device_id: str,
):
    auth = assert_device_authorized(
        service_code,
        old_acs_device_id,
    )

    if not auth["authorized"]:
        return {
            "success": False,
            "reason": auth["reason"],
            "old_device": old_acs_device_id,
            "new_device": new_acs_device_id,
        }

    updated = replace_assigned_device(
        service_code,
        old_acs_device_id,
        new_acs_device_id,
    )

    if not updated:
        return {
            "success": False,
            "reason": "DEVICE_BINDING_NOT_UPDATED",
            "old_device": old_acs_device_id,
            "new_device": new_acs_device_id,
        }

    return {
        "success": True,
        "service_code": service_code,
        "old_device": old_acs_device_id,
        "new_device": new_acs_device_id,
        "device": updated,
    }

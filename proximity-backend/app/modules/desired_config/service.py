from app.services.genieacs import genieacs_client
from .repository import list_desired_configs
from app.modules.device_authority.service import assert_device_authorized

async def restore_service_configuration(
    service_code: str,
    acs_device_id: str
):

    print("RESTORE ACS DEVICE:", acs_device_id)

    auth = assert_device_authorized(service_code, acs_device_id)

    if not auth["authorized"]:
        return {
            "service_code": service_code,
            "acs_device_id": acs_device_id,
            "authorized": False,
            "reason": auth["reason"],
            "actions": []
        }

    configs = list_desired_configs(service_code)

    result = {
        "service_code": service_code,
        "acs_device_id": acs_device_id,
        "actions": []
    }

    for cfg in configs:

        config_type = cfg["config_type"]
        data = cfg["configuration"]


        if config_type == "PPPOE":

            task = await genieacs_client.set_tplink_wan_pppoe_credentials(
                acs_device_id,
                data["username"],
                data["password"]
            )

            result["actions"].append({
                "type": "PPPOE",
                "task": task
            })

        elif config_type == "WIFI":

            if not data.get("restore_allowed", True):
                result["actions"].append({
                    "type": "WIFI",
                    "skipped": True,
                    "reason": "RESTORE_NOT_ALLOWED",
                })
                continue

            task = await genieacs_client.set_tplink_wifi_credentials(
                acs_device_id,
                data["ssid_24"],
                data["password_24"],
                data["ssid_5"],
                data["password_5"],
            )

            result["actions"].append({
                "type": "WIFI",
                "task": task,
            })

    return result

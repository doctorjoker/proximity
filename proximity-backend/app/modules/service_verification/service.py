from app.modules.device_authority.service import assert_device_authorized
from app.modules.desired_config.repository import list_desired_configs
from app.services.genieacs import genieacs_client

from .registry import VERIFY_HANDLERS


def _is_enabled(config: dict) -> bool:
    return config.get("enabled", True) is not False


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

    configs = [
        config
        for config in list_desired_configs(service_code)
        if _is_enabled(config)
    ]

    if not configs:
        return {
            "success": True,
            "service_code": service_code,
            "acs_device_id": acs_device_id,
            "state": "NO_CONFIGURATION",
            "verification": {},
            "summary": {
                "required": 0,
                "verified": 0,
                "operational": 0,
                "failed": 0,
                "unsupported": 0,
            },
        }

    device = await genieacs_client.get_device_raw(acs_device_id)

    verification = {}
    required_types = []
    unsupported_types = []
    operational_types = []
    failed_types = []

    for config in configs:
        config_type = str(config["config_type"]).upper()
        configuration = config.get("configuration") or {}
        required_types.append(config_type)

        verifier = VERIFY_HANDLERS.get(config_type)

        if verifier is None:
            unsupported_types.append(config_type)
            verification[config_type.lower()] = {
                "configured": False,
                "operational": False,
                "supported": False,
                "reason": "VERIFIER_NOT_REGISTERED",
            }
            continue

        result = await verifier(device, configuration)
        result.setdefault("supported", True)
        result.setdefault("operational", bool(result.get("configured")))

        verification[config_type.lower()] = result

        if result["operational"]:
            operational_types.append(config_type)
        else:
            failed_types.append(config_type)

    all_operational = (
        bool(required_types)
        and not unsupported_types
        and not failed_types
        and len(operational_types) == len(required_types)
    )

    state = "SERVICE_OPERATIONAL" if all_operational else "SERVICE_DEGRADED"

    return {
        "success": True,
        "service_code": service_code,
        "acs_device_id": acs_device_id,
        "state": state,
        "verification": verification,
        "summary": {
            "required": len(required_types),
            "verified": len(operational_types) + len(failed_types),
            "operational": len(operational_types),
            "failed": len(failed_types),
            "unsupported": len(unsupported_types),
            "required_types": required_types,
            "operational_types": operational_types,
            "failed_types": failed_types,
            "unsupported_types": unsupported_types,
        },
    }

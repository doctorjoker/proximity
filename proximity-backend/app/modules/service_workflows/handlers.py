from app.modules.device_authority.service import replace_authorized_device
from app.modules.router_availability.service import wait_router_available
from app.modules.customer_services.service import restore_customer_service_configuration
from app.modules.service_verification.service import verify_customer_service
from app.modules.device_authority.service import assert_device_authorized

async def handle_replace_authorized_device(context: dict):
    return replace_authorized_device(
        context["service_code"],
        context["old_acs_device_id"],
        context["new_acs_device_id"],
    )


async def handle_wait_router_available(context: dict):
    return await wait_router_available(
        context["new_acs_device_id"],
    )


async def handle_restore_customer_service_configuration(context: dict):
    return await restore_customer_service_configuration(
        context["service_code"],
        context["new_acs_device_id"],
    )


async def handle_verify_customer_service(context: dict):
    result = await verify_customer_service(
        context["service_code"],
        context["new_acs_device_id"],
    )

    context["state"] = result.get("state")

    return result


async def handle_first_service_bind_device(context: dict):
    auth = assert_device_authorized(
        context["service_code"],
        context["acs_device_id"],
    )

    if not auth["authorized"]:
        return {
            "success": False,
            "state": "NOT_AUTHORIZED",
            "reason": auth["reason"],
        }

    return {
        "success": True,
        "state": "DEVICE_AUTHORIZED",
        "device": auth["device"],
    }


async def handle_first_service_apply_configuration(context: dict):
    return await restore_customer_service_configuration(
        context["service_code"],
        context["acs_device_id"],
    )


async def handle_first_service_verify_service(context: dict):
    result = await verify_customer_service(
        context["service_code"],
        context["acs_device_id"],
    )

    context["state"] = result.get("state")

    return result

ROUTER_REPLACEMENT_HANDLERS = {
    "replace_authorized_device": handle_replace_authorized_device,
    "wait_router_available": handle_wait_router_available,
    "restore_customer_service_configuration": handle_restore_customer_service_configuration,
    "verify_customer_service": handle_verify_customer_service,
}

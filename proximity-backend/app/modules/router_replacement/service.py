from app.modules.device_authority.service import replace_authorized_device

from app.modules.customer_services.service import (
    restore_customer_service_configuration,
)

from app.modules.service_verification.service import (
    verify_customer_service,
)


from app.modules.router_availability.service import (
    wait_router_available,
)

async def replace_customer_router(
    service_code: str,
    old_acs_device_id: str,
    new_acs_device_id: str,
):

    #
    # STEP 1
    # Device Authority
    #
    replacement = replace_authorized_device(
        service_code,
        old_acs_device_id,
        new_acs_device_id,
    )

    availability = await wait_router_available(
        new_acs_device_id,
    )

    if not availability["success"]:
        return {
            "success": False,
            "step": "WAIT_ROUTER",
            "binding": replacement,
            "availability": availability,
        }

    if not replacement["success"]:
        return replacement

    #
    # STEP 2
    # Restore Desired Configuration
    #
    restore = await restore_customer_service_configuration(
        service_code,
        new_acs_device_id,
    )

    if not restore["success"]:
        return {
            "success": False,
            "step": "RESTORE",
            "binding": replacement,
            "restore": restore,
        }

    #
    # STEP 3
    # Verify Runtime
    #
    verification = await verify_customer_service(
        service_code,
        new_acs_device_id,
    )

    return {
        "success": True,
        "service_code": service_code,

        "old_device": old_acs_device_id,
        "new_device": new_acs_device_id,

        "binding": replacement["device"],

        "availability": availability,

        "restore": restore,

        "verification": verification,

        "state": verification["state"],
    }

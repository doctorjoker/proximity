"""
EUREKA 8.0.2

Service Provisioning Workflow Steps
"""

from .acs_service import acs_service


async def bind_device(context):
    return await acs_service.bind_device(
        context,
    )


async def configure_ppp(context):
    return await acs_service.configure_ppp(
        context,
    )


async def configure_wifi(context):
    return await acs_service.configure_wifi(
        context,
    )


async def configure_voip(context):
    return await acs_service.configure_voip(
        context,
    )


async def verify_configuration(context):
    return await acs_service.verify_configuration(
        context,
    )


async def verify_runtime(context):
    return await acs_service.verify_runtime(
        context,
    )


async def complete(context):
    return {
        "success": True,
        "message": "Provisioning completed",
    }

"""
EUREKA 8.0.2

ACS Provisioning Service

Business-independent wrapper around GenieACS.
"""

from app.modules.service_provisioning.schemas import ProvisioningContext
from app.services.genieacs import genieacs_client


class ACSProvisioningService:

    async def bind_device(
        self,
        context: ProvisioningContext,
    ):
        return {
            "success": True,
            "message": "Bind device placeholder",
        }

    async def configure_ppp(
        self,
        context: ProvisioningContext,
    ):
        if not context.device.acs_device_id:
            return {
                "success": False,
                "message": "Missing ACS device id",
                "error": "MISSING_ACS_DEVICE_ID",
            }

        if not context.ppp.username or not context.ppp.password:
            return {
                "success": False,
                "message": "Missing PPP credentials",
                "error": "MISSING_PPP_CREDENTIALS",
            }

        task = await genieacs_client.set_pppoe_credentials(
            acs_device_id=context.device.acs_device_id,
            username=context.ppp.username,
            password=context.ppp.password,
        )

        return {
            "success": True,
            "message": "PPP credentials task created",
            "task": task,
        }

    async def configure_wifi(
        self,
        context: ProvisioningContext,
    ):
        return {
            "success": True,
            "message": "Configure WiFi placeholder",
        }

    async def configure_voip(
        self,
        context: ProvisioningContext,
    ):
        return {
            "success": True,
            "message": "Configure VoIP placeholder",
        }

    async def verify_configuration(
        self,
        context: ProvisioningContext,
    ):
        return {
            "success": True,
            "message": "Verify configuration placeholder",
        }

    async def verify_runtime(
        self,
        context: ProvisioningContext,
    ):
        if not context.device.acs_device_id:
            return {
                "success": False,
                "message": "Missing ACS device id",
                "error": "MISSING_ACS_DEVICE_ID",
            }

        verification = await genieacs_client.verify_pppoe_credentials(
            context.device.acs_device_id,
        )

        if not verification:
            return {
                "success": False,
                "message": "Device not found in ACS",
                "error": "DEVICE_NOT_FOUND_IN_ACS",
            }

        return {
            "success": True,
            "message": "Runtime verification completed",
            "verification": verification,
        }


acs_service = ACSProvisioningService()

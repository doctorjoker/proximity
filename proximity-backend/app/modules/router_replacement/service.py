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

from app.modules.service_workflows.service import (
    start_workflow,
    workflow_running,
    workflow_completed,
    workflow_failed,
)

from app.modules.service_workflows.runner import WorkflowRunner

from app.modules.service_workflows.registry import (
    WORKFLOW_HANDLERS_REGISTRY,
)

from app.modules.service_workflows.definitions.router_replacement import (
    ROUTER_REPLACEMENT_WORKFLOW,
)


runner = WorkflowRunner(
    WORKFLOW_HANDLERS_REGISTRY,
)

async def replace_customer_router(
    service_code: str,
    old_acs_device_id: str,
    new_acs_device_id: str,
):
    workflow = start_workflow(
        workflow_type="ROUTER_REPLACEMENT",
        service_code=service_code,
        acs_device_id=new_acs_device_id,
        payload={
            "old_device": old_acs_device_id,
            "new_device": new_acs_device_id,
        },
    )

    workflow_code = workflow["workflow_code"]

    workflow_running(workflow_code, "BINDING", 20)

    replacement = replace_authorized_device(
        service_code,
        old_acs_device_id,
        new_acs_device_id,
    )

    if not replacement["success"]:
        workflow_failed(
            workflow_code,
            "DEVICE_BINDING_FAILED",
            replacement.get("reason", "Device binding failed"),
        )
        return {
            **replacement,
            "workflow_code": workflow_code,
        }

    workflow_running(workflow_code, "WAIT_ROUTER", 40)

    availability = await wait_router_available(new_acs_device_id)

    if not availability["success"]:
        workflow_failed(
            workflow_code,
            "ROUTER_NOT_AVAILABLE",
            availability.get("state", "Router not available"),
        )
        return {
            "success": False,
            "workflow_code": workflow_code,
            "step": "WAIT_ROUTER",
            "binding": replacement,
            "availability": availability,
        }

    workflow_running(workflow_code, "RESTORE", 70)

    restore = await restore_customer_service_configuration(
        service_code,
        new_acs_device_id,
    )

    if not restore["success"]:
        workflow_failed(
            workflow_code,
            "RESTORE_FAILED",
            restore.get("state", "Restore failed"),
        )
        return {
            "success": False,
            "workflow_code": workflow_code,
            "step": "RESTORE",
            "binding": replacement,
            "availability": availability,
            "restore": restore,
        }

    workflow_running(workflow_code, "VERIFY", 90)

    verification = await verify_customer_service(
        service_code,
        new_acs_device_id,
    )

    result = {
        "state": verification["state"],
        "binding": {
            "success": replacement["success"],
            "device": replacement["device"]["acs_device_id"],
        },
        "availability": {
            "success": availability["success"],
            "state": availability["state"],
        },
        "restore": {
            "success": restore["success"],
            "state": restore["state"],
        },
        "verification": {
            "success": verification["success"],
            "state": verification["state"],
        },
    }

    workflow_completed(workflow_code, result)

    return {
        "success": True,
        "workflow_code": workflow_code,
        "service_code": service_code,
        "old_device": old_acs_device_id,
        "new_device": new_acs_device_id,
        "binding": replacement["device"],
        "availability": availability,
        "restore": restore,
        "verification": verification,
        "state": verification["state"],
    }


async def replace_customer_router_v2(
    workflow_code: str,
    service_code: str,
    old_acs_device_id: str,
    new_acs_device_id: str,
):
    context = {
        "service_code": service_code,
        "old_acs_device_id": old_acs_device_id,
        "new_acs_device_id": new_acs_device_id,
    }

    return await runner.run(
        workflow_code=workflow_code,
        workflow_definition=ROUTER_REPLACEMENT_WORKFLOW,
        context=context,
    )

from typing import Any, Dict

from app.modules.service_workflows.scheduler import schedule_workflow_execution

from .repository import (
    create_execution,
    create_runtime_workflow_record,
    get_execution,
    get_procedure_version,
    list_executions,
    update_execution_scheduler_result,
)


ACTIVE_STATUS = {"ACTIVE", "PUBLISHED"}


def _workflow_type_for_procedure(procedure_code: str) -> str:
    mapping = {
        "PROC-ROUTER-REPLACEMENT": "ROUTER_REPLACEMENT",
        "FIRST_SERVICE_PROVISIONING": "FIRST_SERVICE_PROVISIONING",
        "DEVICE_REBOOT": "DEVICE_REBOOT",
    }
    return mapping.get(procedure_code, procedure_code)


def _workflow_code_from_execution_code(execution_code: str) -> str:
    return execution_code.replace("PEX-", "WF-")


async def service_execute_procedure(code: str, version: str, payload):
    procedure_version = get_procedure_version(code, version)
    if not procedure_version:
        return None

    if procedure_version["version_status"] not in ACTIVE_STATUS:
        return {
            "success": False,
            "status_code": 409,
            "detail": "Only ACTIVE procedure versions can be executed",
            "version_status": procedure_version["version_status"],
        }

    context: Dict[str, Any] = dict(payload.context or {})
    requested_by = payload.requested_by or "Admin Proximity"
    context["requested_by"] = requested_by
    context["procedure_code"] = code
    context["procedure_version"] = version

    workflow_type = _workflow_type_for_procedure(code)

    # Create a temporary execution first, then derive stable codes from its id.
    temp_workflow_code = "WF-TMP"
    execution = create_execution(
        procedure_version=procedure_version,
        workflow_code=temp_workflow_code,
        workflow_type=workflow_type,
        requested_by=requested_by,
        context=context,
        mode=payload.mode,
    )

    workflow_code = _workflow_code_from_execution_code(execution["execution_code"])

    # Update context with stable ids used by downstream services and logs.
    context["execution_code"] = execution["execution_code"]
    context["workflow_code"] = workflow_code

    workflow_record = create_runtime_workflow_record(
        workflow_code=workflow_code,
        workflow_type=workflow_type,
        service_code=context.get("service_code") or context.get("SERVICE_CODE"),
        acs_device_id=context.get("acs_device_id") or context.get("ACS_DEVICE_ID"),
        payload=context,
    )

    if not workflow_record.get("success"):
        scheduler_result = {
            "success": False,
            "status": "FAILED",
            "reason": workflow_record.get("reason"),
        }
        execution = update_execution_scheduler_result(execution["id"], scheduler_result)
        return {
            "success": False,
            "execution": execution,
            "scheduler": scheduler_result,
        }

    scheduler_result = await schedule_workflow_execution(
        workflow_type=workflow_type,
        workflow_code=workflow_code,
        context=context,
    )

    scheduler_result["workflow_code"] = workflow_code
    scheduler_result["workflow_type"] = workflow_type

    execution = update_execution_scheduler_result(
        execution["id"],
        scheduler_result,
    )

    return {
        "success": True,
        "execution": execution,
        "scheduler": scheduler_result,
    }


def service_get_execution(execution_code: str):
    return get_execution(execution_code)


def service_list_executions(limit: int = 100):
    return list_executions(limit)

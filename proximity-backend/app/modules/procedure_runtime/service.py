from typing import Any, Dict

from app.modules.procedures.repository import list_variables
from app.modules.service_workflows.scheduler import schedule_workflow_execution

from .exceptions import ProcedureRuntimeError
from .repository import (
    create_execution,
    create_runtime_workflow_record,
    get_execution,
    get_procedure_version,
    list_executions,
    update_execution_scheduler_result,
)
from .runtime import ProcedureRuntimeEngine


ACTIVE_STATUS = {"ACTIVE", "PUBLISHED"}
SCHEDULER_HANDLER = "schedule_workflow_execution"


def _workflow_type_for_procedure(procedure_code: str) -> str:
    mapping = {
        "PROC-ROUTER-REPLACEMENT": "ROUTER_REPLACEMENT",
        "FIRST_SERVICE_PROVISIONING": "FIRST_SERVICE_PROVISIONING",
        "DEVICE_REBOOT": "DEVICE_REBOOT",
    }
    return mapping.get(procedure_code, procedure_code)


def _workflow_code_from_execution_code(execution_code: str) -> str:
    return execution_code.replace("PEX-", "WF-")


def _runtime_phase() -> dict:
    return {
        "phase_code": "RUNTIME_SCHEDULE",
        "phase_order": 1,
        "name": "Accodamento Workflow Engine",
        "action": SCHEDULER_HANDLER,
        "continue_on_error": False,
    }


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

    runtime_values: Dict[str, Any] = dict(payload.context or {})
    requested_by = payload.requested_by or "Admin Proximity"
    runtime_values["requested_by"] = requested_by
    runtime_values["procedure_code"] = code
    runtime_values["procedure_version"] = version

    workflow_type = _workflow_type_for_procedure(code)

    execution = create_execution(
        procedure_version=procedure_version,
        workflow_code="WF-TMP",
        workflow_type=workflow_type,
        requested_by=requested_by,
        context=runtime_values,
        mode=payload.mode,
    )

    workflow_code = _workflow_code_from_execution_code(execution["execution_code"])
    runtime_values["execution_code"] = execution["execution_code"]
    runtime_values["workflow_code"] = workflow_code

    async def scheduler_handler(runtime_context):
        values = runtime_context.variables
        workflow_record = create_runtime_workflow_record(
            workflow_code=workflow_code,
            workflow_type=workflow_type,
            service_code=values.get("service_code") or values.get("SERVICE_CODE"),
            acs_device_id=values.get("acs_device_id") or values.get("ACS_DEVICE_ID"),
            payload=dict(values),
        )

        if not workflow_record.get("success"):
            scheduler_result = {
                "success": False,
                "status": "FAILED",
                "reason": workflow_record.get("reason") or "WORKFLOW_RECORD_CREATE_FAILED",
                "workflow_code": workflow_code,
                "workflow_type": workflow_type,
            }
            return {
                "success": False,
                "code": "WORKFLOW_RECORD_CREATE_FAILED",
                "message": scheduler_result["reason"],
                "output": {"scheduler": scheduler_result},
            }

        scheduler_result = await schedule_workflow_execution(
            workflow_type=workflow_type,
            workflow_code=workflow_code,
            context=dict(values),
        )
        scheduler_result["workflow_code"] = workflow_code
        scheduler_result["workflow_type"] = workflow_type

        return {
            "success": bool(scheduler_result.get("success")),
            "code": "WORKFLOW_QUEUED" if scheduler_result.get("success") else "WORKFLOW_QUEUE_FAILED",
            "message": "Workflow queued" if scheduler_result.get("success") else "Workflow queue failed",
            "output": {"scheduler": scheduler_result},
        }

    engine = ProcedureRuntimeEngine(
        handlers={SCHEDULER_HANDLER: scheduler_handler},
    )

    try:
        runtime_result = await engine.execute(
            execution=execution,
            procedure={
                "code": procedure_version["procedure_code"],
                "name": procedure_version.get("procedure_name"),
            },
            version={
                "version": procedure_version["version"],
                "status": procedure_version["version_status"],
                "version_id": procedure_version["version_id"],
            },
            variable_definitions=list_variables(code, version) or [],
            runtime_values=runtime_values,
            phases=[_runtime_phase()],
        )
    except ProcedureRuntimeError as exc:
        scheduler_result = {
            "success": False,
            "status": "FAILED",
            "reason": exc.message,
            "error": exc.to_dict(),
            "workflow_code": workflow_code,
            "workflow_type": workflow_type,
        }
        execution = update_execution_scheduler_result(execution["id"], scheduler_result)
        return {
            "success": False,
            "status_code": 422,
            "detail": exc.message,
            "execution": execution,
            "scheduler": scheduler_result,
            "runtime": {"success": False, "error": exc.to_dict()},
        }

    scheduler_result = (
        runtime_result.get("context", {})
        .get("outputs", {})
        .get("scheduler")
    ) or {
        "success": False,
        "status": "FAILED",
        "reason": "Runtime did not return scheduler output",
        "workflow_code": workflow_code,
        "workflow_type": workflow_type,
    }

    execution = update_execution_scheduler_result(
        execution["id"],
        scheduler_result,
    )

    return {
        "success": bool(runtime_result.get("success") and scheduler_result.get("success")),
        "execution": execution,
        "scheduler": scheduler_result,
        "runtime": runtime_result,
    }


def service_get_execution(execution_code: str):
    return get_execution(execution_code)


def service_list_executions(limit: int = 100):
    return list_executions(limit)

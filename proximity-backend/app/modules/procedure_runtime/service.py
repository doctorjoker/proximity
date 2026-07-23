from typing import Any, Dict

from app.modules.procedures.repository import list_phases, list_variables
from app.modules.service_workflows.registry import WORKFLOW_HANDLERS_REGISTRY
from app.modules.service_workflows.scheduler import schedule_workflow_execution

from .exceptions import ProcedureRuntimeError
from .repository import (
    create_execution,
    create_execution_phase,
    create_runtime_workflow_record,
    get_execution,
    get_procedure_version,
    list_executions,
    list_phase_transitions,
    record_execution_phase_attempt,
    update_execution_phase,
    update_execution_scheduler_result,
)
from .runtime import ProcedureRuntimeEngine


ACTIVE_STATUS = {"ACTIVE", "PUBLISHED"}
SCHEDULER_HANDLER = "schedule_workflow_execution"
NATIVE_EXECUTION_MODES = {"NATIVE", "PRODUCTION", "LIVE"}
NATIVE_PROCEDURES = {"FIRST_SERVICE_PROVISIONING"}
TERMINAL_PHASE_TYPES = {"START", "END"}
UNSUPPORTED_NATIVE_TYPES = {"DECISION", "WAIT"}


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


def _noop_handler(runtime_context):
    return {
        "success": True,
        "code": "NOOP",
        "message": "Terminal BPM phase completed",
        "output": {},
    }


def _adapt_workflow_handler(handler_name: str):
    workflow_handler = WORKFLOW_HANDLERS_REGISTRY[handler_name]

    async def adapted(runtime_context):
        legacy_context = dict(runtime_context.variables)
        legacy_context.update(runtime_context.outputs)
        result = await workflow_handler(legacy_context)

        # Preserve mutations performed by historical handlers, for example state.
        for key, value in legacy_context.items():
            if runtime_context.variables.get(key) != value:
                runtime_context.variables[key] = value

        if isinstance(result, dict):
            output = dict(result)
            success = bool(output.get("success", True))
            code = (
                output.get("code")
                or output.get("reason")
                or output.get("state")
                or ("OK" if success else "HANDLER_FAILED")
            )
            message = output.get("message") or output.get("reason") or str(code)
            return {
                "success": success,
                "code": str(code),
                "message": str(message),
                "output": output,
            }

        return result

    adapted.__name__ = f"procedure_{handler_name}"
    return adapted


def _native_handlers(phases: list[dict]) -> dict:
    handlers = {
        "noop": _noop_handler,
    }
    for phase in phases:
        phase_type = str(phase.get("type") or "ACTION").upper()
        action = str(phase.get("action") or "").strip()
        if phase_type in TERMINAL_PHASE_TYPES:
            handlers[action or "noop"] = _noop_handler
            continue
        if action in WORKFLOW_HANDLERS_REGISTRY:
            handlers[action] = _adapt_workflow_handler(action)
    return handlers


def _validate_native_phases(phases: list[dict]) -> list[dict]:
    errors = []
    runnable = []
    for phase in phases:
        phase_type = str(phase.get("type") or "ACTION").upper()
        action = str(phase.get("action") or "").strip()
        name = phase.get("name") or phase.get("id")

        if phase_type in UNSUPPORTED_NATIVE_TYPES:
            errors.append(f"Phase '{name}' uses unsupported native type {phase_type}")
            continue

        if phase_type in TERMINAL_PHASE_TYPES:
            phase = dict(phase)
            phase["action"] = action or "noop"
            runnable.append(phase)
            continue

        if not action:
            errors.append(f"Phase '{name}' has no action")
        elif action not in WORKFLOW_HANDLERS_REGISTRY:
            errors.append(f"Handler '{action}' is not registered")
        else:
            runnable.append(dict(phase))

    if errors:
        raise ProcedureRuntimeError(
            "Native procedure validation failed",
            details={"errors": errors},
        )
    return runnable


async def _execute_native(
    *,
    code: str,
    version: str,
    procedure_version: dict,
    execution: dict,
    runtime_values: Dict[str, Any],
):
    phases = _validate_native_phases(list_phases(code, version) or [])
    handlers = _native_handlers(phases)

    engine = ProcedureRuntimeEngine(
        handlers=handlers,
        services={
            "phase_persistence": {
                "create": create_execution_phase,
                "update": update_execution_phase,
                "record_attempt": record_execution_phase_attempt,
            }
        },
    )

    transitions = list_phase_transitions(int(procedure_version["version_id"])) or []
    runtime_result = await engine.execute_graph(
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
        phases=phases,
        transitions=transitions,
    )

    final_status = "COMPLETED" if runtime_result.get("success") else "FAILED"
    execution = update_execution_scheduler_result(
        execution["id"],
        {
            "success": bool(runtime_result.get("success")),
            "status": final_status,
            "workflow_code": runtime_values.get("workflow_code"),
            "workflow_type": runtime_values.get("workflow_type"),
            "execution_mode": "NATIVE",
            "runtime": runtime_result,
        },
    )
    return {
        "success": bool(runtime_result.get("success")),
        "execution": execution,
        "scheduler": None,
        "runtime": runtime_result,
        "execution_mode": "NATIVE",
    }


async def _execute_legacy_bridge(
    *,
    workflow_type: str,
    workflow_code: str,
    procedure_version: dict,
    execution: dict,
    runtime_values: Dict[str, Any],
    code: str,
    version: str,
):
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
        services={
            "phase_persistence": {
                "create": create_execution_phase,
                "update": update_execution_phase,
                "record_attempt": record_execution_phase_attempt,
            }
        },
    )

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

    scheduler_result = (
        runtime_result.get("context", {}).get("outputs", {}).get("scheduler")
    ) or {
        "success": False,
        "status": "FAILED",
        "reason": "Runtime did not return scheduler output",
        "workflow_code": workflow_code,
        "workflow_type": workflow_type,
    }

    execution = update_execution_scheduler_result(execution["id"], scheduler_result)
    return {
        "success": bool(runtime_result.get("success") and scheduler_result.get("success")),
        "execution": execution,
        "scheduler": scheduler_result,
        "runtime": runtime_result,
        "execution_mode": "LEGACY_BRIDGE",
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
    runtime_values["workflow_type"] = workflow_type

    native_requested = str(payload.mode or "").upper() in NATIVE_EXECUTION_MODES
    native_enabled = code in NATIVE_PROCEDURES and native_requested

    try:
        if native_enabled:
            return await _execute_native(
                code=code,
                version=version,
                procedure_version=procedure_version,
                execution=execution,
                runtime_values=runtime_values,
            )

        return await _execute_legacy_bridge(
            workflow_type=workflow_type,
            workflow_code=workflow_code,
            procedure_version=procedure_version,
            execution=execution,
            runtime_values=runtime_values,
            code=code,
            version=version,
        )
    except ProcedureRuntimeError as exc:
        failure = {
            "success": False,
            "status": "FAILED",
            "reason": exc.message,
            "error": exc.to_dict(),
            "workflow_code": workflow_code,
            "workflow_type": workflow_type,
            "execution_mode": "NATIVE" if native_enabled else "LEGACY_BRIDGE",
        }
        execution = update_execution_scheduler_result(execution["id"], failure)
        return {
            "success": False,
            "status_code": 422,
            "detail": exc.message,
            "execution": execution,
            "scheduler": None if native_enabled else failure,
            "runtime": {"success": False, "error": exc.to_dict()},
            "execution_mode": failure["execution_mode"],
        }


def service_get_execution(execution_code: str):
    return get_execution(execution_code)


def service_list_executions(limit: int = 100):
    return list_executions(limit)

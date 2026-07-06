from .business_repository import list_business_operations
from .repository import (
    create_workflow,
    next_workflow_code,
    retry_workflow,
    get_workflow,
    update_workflow_status,
    pause_workflow,
    resume_workflow,
    cancel_workflow,
    complete_workflow,
    fail_workflow,
    create_workflow_step,
    complete_workflow_step,
    fail_workflow_step,
    list_workflows,
    get_workflow_steps,
)

from .operations_repository import (
    get_workflow_statistics,
    list_queue,
    get_dashboard_data,
)

from .events_repository import (
    create_event,
    list_events,
)


def record_event(
    workflow_code: str,
    event_type: str,
    event_status: str,
    title: str,
    description: str | None = None,
    operation_code: str | None = None,
    worker_name: str | None = None,
    metadata: dict | None = None,
):
    return create_event(
        workflow_code=workflow_code,
        operation_code=operation_code,
        event_type=event_type,
        event_status=event_status,
        title=title,
        description=description,
        worker_name=worker_name,
        metadata=metadata,
    )


async def start_workflow(
    workflow_type: str,
    service_code: str,
    acs_device_id: str | None = None,
    payload: dict | None = None,
    started_by: str = "PROXIMITY",
    parent_workflow_code: str | None = None,
):
    payload = payload or {}

    effective_acs_device_id = (
        acs_device_id
        or payload.get("acs_device_id")
        or payload.get("old_acs_device_id")
        or payload.get("new_acs_device_id")
    )

    workflow_code = next_workflow_code()

    workflow = create_workflow(
        workflow_code=workflow_code,
        workflow_type=workflow_type,
        service_code=service_code,
        acs_device_id=effective_acs_device_id,
        payload=payload,
        started_by=started_by,
        parent_workflow_code=parent_workflow_code,
    )

    record_event(
        workflow_code=workflow_code,
        event_type="WORKFLOW_CREATED",
        event_status="SUCCESS",
        title="Workflow created",
        description=f"{workflow_type} accepted by workflow engine",
    )

    context = {
        "service_code": service_code,
        **payload,
    }

    if acs_device_id is not None:
        context["acs_device_id"] = acs_device_id

    if "acs_device_id" not in context and effective_acs_device_id is not None:
        context["acs_device_id"] = effective_acs_device_id

    from .executor import WorkflowExecutor

    executor = WorkflowExecutor()

    execution = await executor.execute(
        workflow_type=workflow_type,
        workflow_code=workflow_code,
        context=context,
    )

    return {
        "workflow": workflow,
        "execution": execution,
    }


async def workflow_retry(workflow_code: str):
    original = get_workflow(workflow_code)

    if not original:
        return {
            "success": False,
            "reason": "WORKFLOW_NOT_FOUND",
            "workflow_code": workflow_code,
        }

    child = retry_workflow(workflow_code)

    if not child:
        return {
            "success": False,
            "reason": "WORKFLOW_RETRY_NOT_CREATED",
            "workflow_code": workflow_code,
        }

    record_event(
        workflow_code=workflow_code,
        event_type="WORKFLOW_RETRIED",
        event_status="SUCCESS",
        title="Workflow retried",
        description=f"Created retry workflow {child['workflow_code']}",
        metadata={
            "retry_workflow_code": child["workflow_code"],
        },
    )

    record_event(
        workflow_code=child["workflow_code"],
        event_type="WORKFLOW_RETRY_CREATED",
        event_status="SUCCESS",
        title="Retry workflow created",
        description=f"Retry created from {workflow_code}",
        metadata={
            "parent_workflow_code": workflow_code,
        },
    )

    payload = child.get("payload") or {}

    context = {
        "service_code": child["service_code"],
        **payload,
    }

    if "acs_device_id" not in context and child.get("acs_device_id"):
        context["acs_device_id"] = child["acs_device_id"]

    from .executor import WorkflowExecutor

    executor = WorkflowExecutor()

    execution = await executor.execute(
        workflow_type=child["workflow_type"],
        workflow_code=child["workflow_code"],
        context=context,
    )

    return {
        "success": True,
        "original_workflow": original,
        "retry_workflow": child,
        "execution": execution,
    }


def read_workflow_details(workflow_code: str):
    workflow = get_workflow(workflow_code)
    steps = get_workflow_steps(workflow_code)
    events = list_events(workflow_code)

    business_item = None

    for item in list_business_operations(200):
        if item.get("workflow_code") == workflow_code:
            business_item = item
            break

    status = workflow["status"] if workflow else None

    controls = {
        "can_pause": status == "RUNNING",
        "can_resume": status == "PAUSED",
        "can_cancel": status in ["CREATED", "RUNNING", "PAUSED", "FAILED"],
        "can_retry": status == "FAILED",
    }

    return {
        "workflow": workflow,
        "customer": (business_item or {}).get("customer"),
        "service": (business_item or {}).get("service"),
        "device": (business_item or {}).get("device"),
        "operation": business_item,
        "steps": steps,
        "events": events,
        "controls": controls,
    }


def workflow_pause(workflow_code: str):
    workflow = pause_workflow(workflow_code)

    record_event(
        workflow_code=workflow_code,
        event_type="WORKFLOW_PAUSED",
        event_status="SUCCESS",
        title="Workflow paused",
        description="Workflow manually paused by operator",
    )

    return workflow


def workflow_resume(workflow_code: str):
    workflow = resume_workflow(workflow_code)

    record_event(
        workflow_code=workflow_code,
        event_type="WORKFLOW_RESUMED",
        event_status="SUCCESS",
        title="Workflow resumed",
        description="Workflow manually resumed by operator",
    )

    return workflow


def workflow_cancel(workflow_code: str):
    workflow = cancel_workflow(workflow_code)

    record_event(
        workflow_code=workflow_code,
        event_type="WORKFLOW_CANCELLED",
        event_status="SUCCESS",
        title="Workflow cancelled",
        description="Workflow manually cancelled by operator",
    )

    return workflow


def read_workflow_timeline(workflow_code: str):
    return list_events(workflow_code)


def read_workflow(workflow_code: str):
    return get_workflow(workflow_code)


def workflow_running(workflow_code: str, current_step: str, progress: int):
    return update_workflow_status(
        workflow_code=workflow_code,
        status="RUNNING",
        current_step=current_step,
        progress=progress,
    )


def workflow_completed(workflow_code: str, result: dict):
    return complete_workflow(
        workflow_code=workflow_code,
        result=result,
    )


def workflow_failed(workflow_code: str, error_code: str, error_message: str):
    return fail_workflow(
        workflow_code=workflow_code,
        error_code=error_code,
        error_message=error_message,
    )


def workflow_step_started(
    workflow_code: str,
    step_name: str,
    input_data: dict | None = None,
):
    return create_workflow_step(
        workflow_code=workflow_code,
        step_name=step_name,
        input_data=input_data,
    )


def workflow_step_completed(
    step_id: str,
    output_data: dict | None = None,
):
    return complete_workflow_step(
        step_id=step_id,
        output_data=output_data,
    )


def workflow_step_failed(
    step_id: str,
    error_code: str,
    error_message: str,
    output_data: dict | None = None,
):
    return fail_workflow_step(
        step_id=step_id,
        error_code=error_code,
        error_message=error_message,
        output_data=output_data,
    )


def read_workflows(limit: int = 50):
    return list_workflows(limit=limit)


def read_workflow_steps(workflow_code: str):
    return get_workflow_steps(workflow_code)


def read_workflow_statistics():
    return get_workflow_statistics()


def read_queue(limit: int = 50):
    return list_queue(limit)


def read_dashboard(limit: int = 20):
    return get_dashboard_data(limit)


def get_business_dashboard(limit: int = 50):
    return {
        "items": list_business_operations(limit),
    }

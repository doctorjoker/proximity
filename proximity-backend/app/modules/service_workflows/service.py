from .repository import (
    create_workflow,
    next_workflow_code,
    get_workflow,
    update_workflow_status,
    complete_workflow,
    fail_workflow,
    create_workflow_step,
    complete_workflow_step,
    fail_workflow_step,
    list_workflows,
    get_workflow_steps,
)

from .operations_repository import get_workflow_statistics

def start_workflow(
    workflow_type: str,
    service_code: str,
    acs_device_id: str,
    payload: dict | None = None,
    started_by: str = "PROXIMITY",
    parent_workflow_code: str | None = None,
):

    workflow_code = next_workflow_code()

    return create_workflow(
        workflow_code=workflow_code,
        workflow_type=workflow_type,
        service_code=service_code,
        acs_device_id=acs_device_id,
        payload=payload,
        started_by=started_by,
        parent_workflow_code=parent_workflow_code,
    )

def read_workflow(workflow_code: str):
    return get_workflow(workflow_code)

def workflow_running(
    workflow_code: str,
    current_step: str,
    progress: int,
):
    return update_workflow_status(
        workflow_code=workflow_code,
        status="RUNNING",
        current_step=current_step,
        progress=progress,
    )


def workflow_completed(
    workflow_code: str,
    result: dict,
):
    return complete_workflow(
        workflow_code=workflow_code,
        result=result,
    )


def workflow_failed(
    workflow_code: str,
    error_code: str,
    error_message: str,
):
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

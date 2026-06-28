from .repository import (
    create_workflow,
    next_workflow_code,
    get_workflow,
    update_workflow_status,
    complete_workflow,
    fail_workflow,
)


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

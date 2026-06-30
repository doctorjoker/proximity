from app.modules.service_workflows.executor import WorkflowExecutor
from app.modules.service_workflows.queue_repository import (
    enqueue_workflow,
    dequeue_next,
    mark_queue_completed,
    mark_queue_failed,
)
from app.modules.service_workflows.service import read_workflow


executor = WorkflowExecutor()


async def schedule_workflow_execution(
    workflow_type: str,
    workflow_code: str,
    context: dict,
):
    enqueue_workflow(
        workflow_code=workflow_code,
    )

    return {
        "success": True,
        "workflow_code": workflow_code,
        "status": "QUEUED",
    }


async def schedule_next_workflow():
    queue_item = dequeue_next()

    if queue_item is None:
        return None

    workflow = read_workflow(
        queue_item["workflow_code"],
    )

    if workflow is None:
        mark_queue_failed(
            queue_item["id"],
            "WORKFLOW_NOT_FOUND",
        )
        return None

    context = {
        "service_code": workflow["service_code"],
        "old_acs_device_id": workflow["payload"].get("old_device"),
        "new_acs_device_id": workflow["payload"].get("new_device"),
    }

    try:
        result = await executor.execute(
            workflow_type=workflow["workflow_type"],
            workflow_code=workflow["workflow_code"],
            context=context,
        )

        if result.get("success") is False:
            mark_queue_failed(
                queue_item["id"],
                result.get("error")
                or result.get("failed_step")
                or "WORKFLOW_FAILED",
            )
        else:
            mark_queue_completed(
                queue_item["id"],
            )

        return result

    except Exception as exc:
        mark_queue_failed(
            queue_item["id"],
            str(exc),
        )
        raise

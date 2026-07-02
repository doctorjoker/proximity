from app.modules.service_workflows.executor import WorkflowExecutor
from app.modules.service_workflows.queue_repository import (
    enqueue_workflow,
    dequeue_next,
    mark_queue_completed,
    mark_queue_failed,
    reschedule_queue_item,
)
from app.modules.service_workflows.service import read_workflow


MAX_RETRY_COUNT = 3
RETRY_DELAY_SECONDS = 30

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


def _should_retry(queue_item: dict) -> bool:
    return queue_item.get("retry_count", 0) < MAX_RETRY_COUNT


def _reschedule_or_fail(
    queue_item: dict,
    error: str,
):
    if _should_retry(queue_item):
        return reschedule_queue_item(
            queue_item["id"],
            delay_seconds=RETRY_DELAY_SECONDS,
        )

    return mark_queue_failed(
        queue_item["id"],
        error,
    )


async def schedule_next_workflow():
    queue_item = dequeue_next()

    if queue_item is None:
        return None

    workflow = read_workflow(
        queue_item["workflow_code"],
    )

    if workflow is None:
        _reschedule_or_fail(
            queue_item,
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
            _reschedule_or_fail(
                queue_item,
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
        _reschedule_or_fail(
            queue_item,
            str(exc),
        )
        raise

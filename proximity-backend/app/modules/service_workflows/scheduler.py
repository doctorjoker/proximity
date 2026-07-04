from app.modules.service_workflows.executor import WorkflowExecutor
from app.modules.service_workflows.queue_repository import (
    enqueue_workflow,
    dequeue_next,
    mark_queue_completed,
    mark_queue_failed,
    reschedule_queue_item,
)
from app.modules.service_workflows.service import read_workflow
from app.modules.service_workflows.service import record_event

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
    record_event(
        workflow_code=workflow["workflow_code"],
        event_type="WORKFLOW_RUNNING",
        event_status="RUNNING",
        title="Workflow running",
        description="Worker started workflow execution",
        worker_name="PROXIMITY-WORKER",
    )
    try:
        result = await executor.execute(
            workflow_type=workflow["workflow_type"],
            workflow_code=workflow["workflow_code"],
            context=context,
        )

        if result.get("success") is False:
            failure_reason = (
                result.get("error")
                or result.get("failed_step")
                or "WORKFLOW_FAILED"
            )

            record_event(
                workflow_code=workflow["workflow_code"],
                event_type="WORKFLOW_FAILED",
                event_status="FAILED",
                title="Workflow failed",
                description=failure_reason,
                worker_name="PROXIMITY-WORKER",
                metadata=result,
            )

            _reschedule_or_fail(
                queue_item,
                failure_reason,
            )
        else:
            record_event(
                workflow_code=workflow["workflow_code"],
                event_type="WORKFLOW_COMPLETED",
                event_status="SUCCESS",
                title="Workflow completed",
                description="Workflow completed successfully",
                worker_name="PROXIMITY-WORKER",
                metadata=result,
            )

            mark_queue_completed(
                queue_item["id"],
            )

        return result

    except Exception as exc:
        record_event(
            workflow_code=workflow["workflow_code"],
            event_type="WORKFLOW_EXCEPTION",
            event_status="FAILED",
            title="Workflow exception",
            description=str(exc),
            worker_name="PROXIMITY-WORKER",
            metadata={
                "exception": str(exc),
            },
        )

        _reschedule_or_fail(
            queue_item,
            str(exc),
        )
        raise

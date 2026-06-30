from app.modules.service_workflows.executor import WorkflowExecutor


executor = WorkflowExecutor()


async def schedule_workflow_execution(
    workflow_type: str,
    workflow_code: str,
    context: dict,
):
    return await executor.execute(
        workflow_type=workflow_type,
        workflow_code=workflow_code,
        context=context,
    )

from app.modules.service_workflows.executor import WorkflowExecutor
from app.modules.service_workflows.queue_repository import (
    enqueue_workflow,
    dequeue_next,
    mark_queue_completed,
    mark_queue_failed,
)


executor = WorkflowExecutor()


async def schedule_workflow_execution(
    workflow_type: str,
    workflow_code: str,
    context: dict,
):
    enqueue_workflow(
        workflow_code=workflow_code,
    )

    queue_item = dequeue_next()

    if queue_item is None:
        return {
            "success": False,
            "workflow_code": workflow_code,
            "error": "NO_QUEUE_ITEM_AVAILABLE",
        }

    try:
        result = await executor.execute(
            workflow_type=workflow_type,
            workflow_code=queue_item["workflow_code"],
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


async def schedule_next_workflow():
    return None

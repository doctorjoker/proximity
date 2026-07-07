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
from app.modules.service_workflows.lock_repository import (
    acquire_lock,
    release_locks,
)

DEFAULT_RETRY_POLICY = {
    "max_retry": 3,
    "delay_seconds": 30,
}

WORKFLOW_RETRY_POLICY = {
    "FIRST_SERVICE_PROVISIONING": {
        "max_retry": 0,
        "delay_seconds": 0,
    },
    "ROUTER_REPLACEMENT": {
        "max_retry": 2,
        "delay_seconds": 15,
    },
    "FIRMWARE_UPGRADE": {
        "max_retry": 5,
        "delay_seconds": 120,
    },
}

NON_RETRYABLE_ERRORS = {
    "DEVICE_NOT_ASSIGNED",
    "PROVISIONING_DISABLED",
    "DEVICE_NOT_ACTIVE",
    "NOT_AUTHORIZED",
    "VALIDATION_FAILED",
    "WORKFLOW_NOT_FOUND",
}

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


def _retry_policy_for(workflow: dict | None):
    if not workflow:
        return DEFAULT_RETRY_POLICY

    return WORKFLOW_RETRY_POLICY.get(
        workflow.get("workflow_type"),
        DEFAULT_RETRY_POLICY,
    )


def _is_retryable_error(error: str | None) -> bool:
    if not error:
        return True

    return error not in NON_RETRYABLE_ERRORS


def _should_retry(
    queue_item: dict,
    workflow: dict | None,
    error: str | None,
) -> bool:
    if not _is_retryable_error(error):
        return False

    policy = _retry_policy_for(workflow)

    return queue_item.get("retry_count", 0) < policy["max_retry"]


def _reschedule_or_fail(
    queue_item: dict,
    workflow: dict | None,
    error: str,
):
    policy = _retry_policy_for(workflow)

    if _should_retry(
        queue_item=queue_item,
        workflow=workflow,
        error=error,
    ):
        return reschedule_queue_item(
            queue_item["id"],
            delay_seconds=policy["delay_seconds"],
        )

    return mark_queue_failed(
        queue_item["id"],
        error,
    )


def _failure_reason(result: dict):
    result_payload = result.get("result")

    if isinstance(result_payload, dict):
        return (
            result_payload.get("reason")
            or result_payload.get("state")
            or result.get("failed_step")
            or result.get("error")
            or "WORKFLOW_FAILED"
        )

    return (
        result.get("error")
        or result.get("failed_step")
        or "WORKFLOW_FAILED"
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
            queue_item=queue_item,
            workflow=None,
            error="WORKFLOW_NOT_FOUND",
        )
        return None

    payload = workflow.get("payload") or {}

    context = {
        "service_code": workflow["service_code"],
        **payload,
    }

    if (
        "acs_device_id" not in context
        and workflow.get("acs_device_id")
    ):
        context["acs_device_id"] = workflow["acs_device_id"]

    service_lock = acquire_lock(
        workflow_code=workflow["workflow_code"],
        resource_type="SERVICE",
        resource_id=workflow["service_code"],
    )

    if not service_lock["success"]:
        record_event(
            workflow_code=workflow["workflow_code"],
            event_type="WORKFLOW_LOCKED",
            event_status="WAITING",
            title="Workflow waiting",
            description="Service is already locked",
            worker_name="PROXIMITY-WORKER",
        )

        _reschedule_or_fail(
            queue_item=queue_item,
            workflow=workflow,
            error="RESOURCE_LOCKED",
        )

        return {
            "success": False,
            "reason": "RESOURCE_LOCKED",
            "workflow_code": workflow["workflow_code"],
        }

    lock_acquired = service_lock["success"]

    record_event(
        workflow_code=workflow["workflow_code"],
        event_type="WORKFLOW_LOCK_ACQUIRED",
        event_status="SUCCESS",
        title="Lock acquired",
        description=(
            f"SERVICE {workflow['service_code']} locked "
            "for workflow execution"
        ),
        worker_name="PROXIMITY-WORKER",
        metadata={
            "resource_type": "SERVICE",
            "resource_id": workflow["service_code"],
        },
    )

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
            failure_reason = _failure_reason(result)

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
                queue_item=queue_item,
                workflow=workflow,
                error=failure_reason,
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
            queue_item=queue_item,
            workflow=workflow,
            error=str(exc),
        )
        raise

    finally:

        if lock_acquired:
            release_locks(
                workflow["workflow_code"],
            )

            record_event(
                workflow_code=workflow["workflow_code"],
                event_type="WORKFLOW_LOCK_RELEASED",
                event_status="SUCCESS",
                title="Lock released",
                description=(
                    f"SERVICE {workflow['service_code']} unlocked"
                ),
                worker_name="PROXIMITY-WORKER",
                metadata={
                    "resource_type": "SERVICE",
                    "resource_id": workflow["service_code"],
                },
            )

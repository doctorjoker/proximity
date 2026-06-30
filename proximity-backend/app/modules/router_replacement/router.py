from fastapi import APIRouter, BackgroundTasks

from app.modules.service_workflows.service import start_workflow
from app.modules.service_workflows.scheduler import schedule_workflow_execution

from .schemas import RouterReplacementRequest
from .service import (
    replace_customer_router,
)

router = APIRouter(
    prefix="/api/v1/router-replacement",
    tags=["router-replacement"],
)


@router.post("/{service_code}/replace")
async def replace_router(
    service_code: str,
    payload: RouterReplacementRequest,
):
    return await replace_customer_router(
        service_code,
        payload.old_acs_device_id,
        payload.new_acs_device_id,
    )


@router.post("/{service_code}/replace-v2")
async def api_replace_router_v2(
    service_code: str,
    request: RouterReplacementRequest,
    background_tasks: BackgroundTasks,
):
    workflow = start_workflow(
        workflow_type="ROUTER_REPLACEMENT",
        service_code=service_code,
        acs_device_id=request.new_acs_device_id,
        payload={
            "old_device": request.old_acs_device_id,
            "new_device": request.new_acs_device_id,
        },
    )

    background_tasks.add_task(
        schedule_workflow_execution,
        workflow_type="ROUTER_REPLACEMENT",
        workflow_code=workflow["workflow_code"],
        context={
            "service_code": service_code,
            "old_acs_device_id": request.old_acs_device_id,
            "new_acs_device_id": request.new_acs_device_id,
        },
    )

    return {
        "accepted": True,
        "workflow_code": workflow["workflow_code"],
        "workflow_type": "ROUTER_REPLACEMENT",
        "service_code": service_code,
        "status": "CREATED",
        "message": "Workflow accepted for asynchronous execution",
    }

from fastapi import APIRouter

from app.modules.service_workflows.service import start_workflow

from .schemas import RouterReplacementRequest
from .service import (
    replace_customer_router,
    replace_customer_router_v2,
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

    return await replace_customer_router_v2(
        workflow_code=workflow["workflow_code"],
        service_code=service_code,
        old_acs_device_id=request.old_acs_device_id,
        new_acs_device_id=request.new_acs_device_id,
    )

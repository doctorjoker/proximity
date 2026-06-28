from fastapi import APIRouter

from .schemas import WorkflowStartRequest

from .service import (
    start_workflow,
    read_workflow,
    workflow_running,
    workflow_completed,
    workflow_failed,
)

router = APIRouter(
    prefix="/api/v1/service-workflows",
    tags=["Service Workflows"],
)


@router.post("/start")
async def api_start_workflow(
    request: WorkflowStartRequest,
):
    return start_workflow(
        workflow_type=request.workflow_type,
        service_code=request.service_code,
        acs_device_id=request.acs_device_id,
    )

@router.get("/{workflow_code}")
async def api_get_workflow(
    workflow_code: str,
):
    return read_workflow(workflow_code)


@router.post("/{workflow_code}/running")
async def api_running(
    workflow_code: str,
):
    return workflow_running(
        workflow_code,
        current_step="BINDING",
        progress=20,
    )

@router.post("/{workflow_code}/complete")
async def api_complete(
    workflow_code: str,
):
    return workflow_completed(
        workflow_code,
        {
            "state": "SERVICE_OPERATIONAL"
        },
    )

@router.post("/{workflow_code}/fail")
async def api_fail(
    workflow_code: str,
):
    return workflow_failed(
        workflow_code,
        "TIMEOUT",
        "Router did not appear in ACS",
    )



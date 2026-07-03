from fastapi import APIRouter

from .schemas import WorkflowStartRequest

from .service import get_business_dashboard

from .service import (
    start_workflow,
    read_workflow,
    workflow_running,
    workflow_completed,
    workflow_failed,
    read_workflows,
    read_workflow_steps,
    read_workflow_statistics,
    read_queue,
    read_dashboard,
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

@router.get("/queue")
async def api_queue(
    limit: int = 50,
):
    return {
        "items": read_queue(limit),
    }

@router.get("/dashboard")
async def api_dashboard(
    limit: int = 20,
):
    return read_dashboard(limit)

@router.get("/business-dashboard")
def business_dashboard(limit: int = 50):
    return get_business_dashboard(limit)


@router.get("")
async def api_list_workflows(
    limit: int = 50,
):
    return {
        "items": read_workflows(limit=limit),
    }

@router.get("/stats")
async def api_workflow_statistics():
    return read_workflow_statistics()

@router.get("/{workflow_code}/steps")
async def api_get_workflow_steps(
    workflow_code: str,
):
    return {
        "workflow_code": workflow_code,
        "steps": read_workflow_steps(workflow_code),
    }

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


from fastapi import APIRouter, HTTPException

from .repository import load_service_context
from .service import execute_service_provisioning

router = APIRouter(
    prefix="/api/v1/service-provisioning",
    tags=["Service Provisioning"],
)


@router.post("/{service_code}/start")
async def start_service_provisioning(
    service_code: str,
):
    context = load_service_context(
        service_code,
    )

    if context is None:
        raise HTTPException(
            status_code=404,
            detail="Service not found",
        )

    result = await execute_service_provisioning(
        workflow_code=f"PRV-{service_code}",
        context=context,
    )

    return result

from fastapi import APIRouter

from .schemas import RouterAvailabilityRequest
from .service import wait_router_available

router = APIRouter(
    prefix="/api/v1/router-availability",
    tags=["Router Availability"],
)


@router.post("/check")
async def check_router(
    request: RouterAvailabilityRequest,
):
    return await wait_router_available(
        request.acs_device_id,
    )

from fastapi import APIRouter

from .schemas import RouterReplacementRequest
from .service import replace_customer_router


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

from fastapi import APIRouter

from .schemas import ServiceVerificationRequest
from .service import verify_customer_service


router = APIRouter(
    prefix="/api/v1/service-verification",
    tags=["service-verification"],
)


@router.post("/{service_code}/verify")
async def verify_service(
    service_code: str,
    payload: ServiceVerificationRequest,
):

    return await verify_customer_service(
        service_code,
        payload.acs_device_id
    )

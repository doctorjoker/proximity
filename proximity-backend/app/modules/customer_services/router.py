from fastapi import APIRouter

from .schemas import CustomerServiceRestoreRequest
from .service import restore_customer_service_configuration


router = APIRouter(
    prefix="/api/v1/customer-services",
    tags=["customer-services"],
)


@router.post("/{service_code}/restore")
async def api_restore_customer_service(
    service_code: str,
    payload: CustomerServiceRestoreRequest,
):
    result = await restore_customer_service_configuration(
        service_code,
        payload.acs_device_id,
    )

    return result

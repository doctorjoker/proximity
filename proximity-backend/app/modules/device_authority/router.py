from fastapi import APIRouter

from .schemas import DeviceAuthorizationRequest
from .repository import get_assigned_devices
from .service import assert_device_authorized


router = APIRouter(
    prefix="/api/v1/device-authority",
    tags=["device-authority"],
)


@router.get("/{service_code}")
def api_get_devices(service_code: str):
    return {
        "success": True,
        "service_code": service_code,
        "items": get_assigned_devices(service_code)
    }


@router.post("/{service_code}/authorize")
def api_authorize_device(
    service_code: str,
    payload: DeviceAuthorizationRequest
):
    result = assert_device_authorized(
        service_code,
        payload.acs_device_id
    )

    return {
        "success": result["authorized"],
        **result
    }

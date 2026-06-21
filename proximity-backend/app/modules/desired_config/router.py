from fastapi import APIRouter
from .schemas import DesiredConfigUpsert, RestoreRequest
from .repository import list_desired_configs, upsert_desired_config
from .service import restore_service_configuration

router = APIRouter(
    prefix="/api/v1/desired-config",
    tags=["desired-config"],
)


@router.get("/{service_code}")
def api_list_desired_configs(service_code: str):
    return {
        "success": True,
        "service_code": service_code,
        "items": list_desired_configs(service_code),
    }



    return {
        "success": True,
        "service_code": service_code,
        "config_type": config_type.upper(),
        "item": item,
    }

@router.post("/{service_code}/restore")
async def api_restore_service(
    service_code: str,
    payload: RestoreRequest,
):
    result = await restore_service_configuration(
        service_code,
        payload.acs_device_id
    )

    return {
        "success": True,
        "restore": result
    }



@router.post("/{service_code}/{config_type}")
def api_upsert_desired_config(
    service_code: str,
    config_type: str,
    payload: DesiredConfigUpsert,
):
    item = upsert_desired_config(service_code, config_type, payload)

    return {
        "success": True,
        "service_code": service_code,
        "config_type": config_type.upper(),
        "item": item,
    }


from fastapi import APIRouter, HTTPException
from .schemas import CustomerServiceCreate, ProvisionRequest, DeviceBindingCreate
from app.services.genieacs import genieacs_client
from .repository import (
    list_customer_services,
    get_customer_service,
    create_customer_service,
    create_provisioning_job,
    bind_device_to_service,
    get_device_binding,
    update_provisioning_job_state,
)

router = APIRouter(prefix="/api/v1/customer-services", tags=["Customer Services"])


@router.get("")
def api_list_customer_services():
    return {
        "success": True,
        "items": list_customer_services()
    }


@router.get("/{service_code}")
def api_get_customer_service(service_code: str):
    item = get_customer_service(service_code)
    if not item:
        raise HTTPException(status_code=404, detail="Customer service not found")

    return {
        "success": True,
        "item": item
    }


@router.post("")
def api_create_customer_service(payload: CustomerServiceCreate):
    item = create_customer_service(payload)
    return {
        "success": True,
        "item": item
    }


@router.post("/{service_code}/provision")
async def api_provision_customer_service(service_code: str, payload: ProvisionRequest):
    item = get_customer_service(service_code)
    if not item:
        raise HTTPException(status_code=404, detail="Customer service not found")

    binding = get_device_binding(service_code)
    if not binding:
        raise HTTPException(status_code=400, detail="No ACS device binding found for service")

    if not item.get("pppoe_username") or not item.get("pppoe_password"):
        raise HTTPException(status_code=400, detail="Missing PPPoE credentials")

    job = create_provisioning_job(service_code, payload.requested_by)

    acs_task = await genieacs_client.set_pppoe_credentials(
        binding["acs_device_id"],
        item["pppoe_username"],
        item["pppoe_password"],
    )

    job = update_provisioning_job_state(
        job["job_code"],
        "ACS_TASK_CREATED",
        {
            "acs_device_id": binding["acs_device_id"],
            "acs_task": acs_task,
        },
    )
    return {
        "success": True,
        "service_code": service_code,
        "job_code": job["job_code"],
        "state": "ACS_TASK_CREATED",
        "acs_device_id": binding["acs_device_id"],
        "acs_task": acs_task,
        "job": job,
    }
@router.post("/{service_code}/bind-device")
def api_bind_device(service_code: str, payload: DeviceBindingCreate):
    item = get_customer_service(service_code)
    if not item:
        raise HTTPException(status_code=404, detail="Customer service not found")

    binding = bind_device_to_service(service_code, payload)

    return {
        "success": True,
        "service_code": service_code,
        "binding": binding
    }


@router.get("/{service_code}/device-binding")
def api_get_device_binding(service_code: str):
    item = get_customer_service(service_code)
    if not item:
        raise HTTPException(status_code=404, detail="Customer service not found")

    binding = get_device_binding(service_code)

    return {
        "success": True,
        "service_code": service_code,
        "binding": binding
    }


@router.post("/{service_code}/verify")
async def api_verify_customer_service(service_code: str):

    item = get_customer_service(service_code)

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Customer service not found"
        )

    binding = get_device_binding(service_code)

    if not binding:
        raise HTTPException(
            status_code=400,
            detail="No ACS device binding found"
        )

    verification = await genieacs_client.verify_pppoe_credentials(
        binding["acs_device_id"]
    )

    expected_username = item["pppoe_username"]
    actual_username = verification["username"]

    match = expected_username == actual_username

    return {
        "success": True,
        "service_code": service_code,
        "expected_username": expected_username,
        "actual_username": actual_username,
        "match": match
    }

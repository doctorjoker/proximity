from fastapi import APIRouter
from .schemas import ActivationRequest

from app.modules.provisioning.schemas import WFMProvisionRequest
from app.modules.provisioning.router import api_wfm_service_order

router = APIRouter(
    prefix="/api/v1/activation",
    tags=["activation"],
)


@router.get("/health")
async def activation_health():
    return {
        "success": True,
        "module": "activation",
        "status": "ok",
    }


@router.post("/service-order")
async def activate_service_order(payload: ActivationRequest):

    result = await api_wfm_service_order(
        WFMProvisionRequest(
            service_order_code=payload.service_order_code,
            customer_id=payload.customer_id,
            customer_name=payload.customer_name,
            service_type=payload.service_type,
            access_type=payload.access_type,
            plan_name=payload.plan_name,
            pppoe_username=payload.pppoe_username,
            pppoe_password=payload.pppoe_password,
            vlan=payload.vlan,
            ont_serial=payload.ont_serial,
            acs_device_id=payload.acs_device_id,
        )
    )

    return {
        "success": True,
        "activation_status": "STARTED",
        "activation_type": "SERVICE_ORDER",
        "result": result,
    }

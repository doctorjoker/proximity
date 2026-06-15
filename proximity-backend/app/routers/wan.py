from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.device import Device
from app.device_profiles.resolver import read_capability, resolve_device_profile

from pydantic import BaseModel
from app.services.genieacs import GenieACSClient

router = APIRouter(
    prefix="/api/v1/devices",
    tags=["Device WAN"],
)


@router.get("/{device_id}/wan")
async def get_device_wan(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    payload = device.raw_acs_payload or {}
    profile = resolve_device_profile(device)

    fields = [
        "wan_ppp_username",
        "wan_ppp_status",
        "wan_ip_address",
        "wan_nat_enabled",
        "wan_vlan_id",
        "dns_servers",
    ]

    values = {
        field: read_capability(device, payload, field)
        for field in fields
    }

    ppp_username = values["wan_ppp_username"]["value"]
    ppp_status = values["wan_ppp_status"]["value"]
    wan_ip = values["wan_ip_address"]["value"]
    vlan_id = values["wan_vlan_id"]["value"]

    if ppp_username:
        mode = "PPPOE"
    elif wan_ip:
        mode = "IPOE"
    else:
        mode = "UNKNOWN"

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "profile": {
            "profile_code": profile.get("profile_code"),
            "name": profile.get("name"),
            "capabilities": profile.get("capabilities", {}),
        },
        "wan": {
            "mode": mode,
            "pppoe_username": ppp_username,
            "pppoe_password_set": bool(
                read_capability(device, payload, "wan_ppp_password")["value"]
            ),
            "ppp_status": ppp_status,
            "ip_address": wan_ip,
            "vlan_id": vlan_id,
            "nat_enabled": values["wan_nat_enabled"]["value"],
            "dns": [
                values["dns_servers"]["value"],
            ] if values["dns_servers"]["value"] else [],
        },
        "raw_paths": values,
    }

class PPPoEConfigRequest(BaseModel):
    username: str
    password: str | None = None


@router.post("/{device_id}/wan/pppoe")
async def set_device_pppoe(
    device_id: str,
    payload: PPPoEConfigRequest,
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    current_payload = device.raw_acs_payload or {}

    username_cap = read_capability(
        device,
        current_payload,
        "wan_ppp_username",
    )

    password_cap = read_capability(
        device,
        current_payload,
        "wan_ppp_password",
    )

    username_path = (
        username_cap.get("path")
        or "Device.PPP.Interface.1.Username"
    )

    password_path = (
        password_cap.get("path")
        or "Device.PPP.Interface.1.Password"
    )

    parameter_values = [
        [
            username_path,
            payload.username,
            "xsd:string",
        ]
    ]

    if payload.password:
        parameter_values.append(
            [
                password_path,
                payload.password,
                "xsd:string",
            ]
        )

    client = GenieACSClient()

    result = await client.create_task(
        device.acs_device_id,
        {
            "name": "setParameterValues",
            "parameterValues": parameter_values,
        },
    )

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "mode": "PPPOE",
        "username_path": username_path,
        "password_path": password_path if payload.password else None,
        "username": payload.username,
        "password_updated": bool(payload.password),
        "result": result,
    }

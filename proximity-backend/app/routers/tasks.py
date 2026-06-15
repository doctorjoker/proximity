from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.device import Device
from app.services.genieacs import GenieACSClient

router = APIRouter(
    prefix="/api/v1/devices",
    tags=["Device Tasks"],
)


@router.post("/{device_id}/tasks/refresh")
async def refresh_device(
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

    client = GenieACSClient()

    result = await client.create_task(
        device.acs_device_id,
        {
            "name": "refreshObject",
            "objectName": "Device",
        },
    )

    return {
        "success": True,
        "task": "refresh",
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "result": result,
    }


@router.post("/{device_id}/tasks/reboot")
async def reboot_device(
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

    client = GenieACSClient()

    result = await client.create_task(
        device.acs_device_id,
        {
            "name": "reboot",
        },
    )

    return {
        "success": True,
        "task": "reboot",
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "result": result,
    }

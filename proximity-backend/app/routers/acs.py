from fastapi import APIRouter

from app.services.genieacs import genieacs_client

from app.models.device import Device
from app.db.session import get_db
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException

router = APIRouter(prefix="/api/v1/acs", tags=["ACS"])


@router.get("/devices")
async def list_acs_devices():
    devices = await genieacs_client.get_devices()
    return {
        "success": True,
        "count": len(devices),
        "items": devices,
    }


@router.get("/devices/{device_id}/acs/raw")
async def get_device_raw(
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

    raw = await genieacs_client.get_device_raw(
        device.acs_device_id
    )

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "raw": raw,
    }

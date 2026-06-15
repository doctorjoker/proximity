from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.genieacs import genieacs_client
from app.repositories.device_repository import upsert_device_from_acs

router = APIRouter(prefix="/api/v1/acs/discovery", tags=["ACS Discovery"])


@router.post("/sync")
async def sync_acs_devices(db: Session = Depends(get_db)):
    devices = await genieacs_client.get_devices()

    synced = []

    for acs_device in devices:
        device = upsert_device_from_acs(db, acs_device)
        synced.append({
            "id": str(device.id),
            "device_code": device.device_code,
            "acs_device_id": device.acs_device_id,
            "serial_number": device.serial_number,
            "manufacturer": device.manufacturer,
            "model": device.model,
            "software_version": device.software_version,
            "status": device.status,
        })

    return {
        "success": True,
        "source": "GENIEACS",
        "count": len(synced),
        "items": synced,
    }

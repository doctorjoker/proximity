from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.repositories.device_repository import upsert_device_from_acs
from app.services.genieacs import genieacs_client


async def synchronize_acs_devices(db: Session) -> dict[str, Any]:
    """Synchronize the current GenieACS inventory into Proximity.

    This is the single synchronization implementation used by both the
    administrative HTTP endpoint and the automatic background worker.
    """
    devices = await genieacs_client.get_devices()
    # One response item per physical device, even when GenieACS exposes
    # multiple identities (for example Device2 and IGD) for one serial.
    synced_by_device: dict[str, dict[str, Any]] = {}

    for acs_device in devices:
        device = upsert_device_from_acs(db, acs_device)
        synced_by_device[str(device.id)] = {
            "id": str(device.id),
            "device_code": device.device_code,
            "acs_device_id": device.acs_device_id,
            "serial_number": device.serial_number,
            "manufacturer": device.manufacturer,
            "model": device.model,
            "product_class": device.product_class,
            "software_version": device.software_version,
            "status": device.status,
        }

    synced = list(synced_by_device.values())
    return {
        "success": True,
        "source": "GENIEACS",
        "acs_identity_count": len(devices),
        "count": len(synced),
        "items": synced,
    }

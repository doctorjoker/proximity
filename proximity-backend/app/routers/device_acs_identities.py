from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db

router = APIRouter(prefix="/api/v1/devices", tags=["Device360"])


def _serialize_dt(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return str(value)


@router.get("/{device_identifier}/acs-identities")
def get_device_acs_identities(
    device_identifier: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return all ACS identities associated with one physical CPE.

    ``device_identifier`` accepts the internal UUID, device_code, serial number,
    or current preferred ACS id. This keeps Device360 compatible with existing
    callers while the physical-device model becomes the stable source of truth.
    """

    device_sql = text(
        """
        SELECT
            d.id,
            d.device_code,
            d.serial_number,
            d.manufacturer,
            d.model,
            d.product_class,
            d.software_version,
            d.hardware_version,
            d.acs_device_id,
            d.acs_last_inform AS last_inform,
            d.status
        FROM devices d
        WHERE
            CAST(d.id AS TEXT) = :identifier
            OR d.device_code = :identifier
            OR d.serial_number = :identifier
            OR d.acs_device_id = :identifier
        LIMIT 1
        """
    )

    device = db.execute(device_sql, {"identifier": device_identifier}).mappings().first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    identities_sql = text(
        """
        SELECT
            i.id,
            i.acs_device_id,
            i.product_class,
            i.software_version,
            i.hardware_version,
            i.first_seen,
            i.last_seen,
            i.active,
            i.raw_acs_payload AS metadata,
            CASE WHEN i.acs_device_id = :preferred_acs_id THEN TRUE ELSE FALSE END AS preferred
        FROM device_acs_identities i
        WHERE i.device_id = :device_id
        ORDER BY
            CASE WHEN i.acs_device_id = :preferred_acs_id THEN 0 ELSE 1 END,
            i.last_seen DESC NULLS LAST,
            i.first_seen DESC NULLS LAST
        """
    )

    identities = db.execute(
        identities_sql,
        {
            "device_id": device["id"],
            "preferred_acs_id": device["acs_device_id"],
        },
    ).mappings().all()

    items = []
    for identity in identities:
        items.append(
            {
                "id": str(identity["id"]),
                "acs_device_id": identity["acs_device_id"],
                "product_class": identity["product_class"],
                "software_version": identity["software_version"],
                "hardware_version": identity["hardware_version"],
                "first_seen": _serialize_dt(identity["first_seen"]),
                "last_seen": _serialize_dt(identity["last_seen"]),
                "active": bool(identity["active"]),
                "preferred": bool(identity["preferred"]),
                "metadata": identity["metadata"] or {},
            }
        )

    return {
        "device": {
            "id": str(device["id"]),
            "device_code": device["device_code"],
            "serial_number": device["serial_number"],
            "manufacturer": device["manufacturer"],
            "model": device["model"],
            "product_class": device["product_class"],
            "software_version": device["software_version"],
            "hardware_version": device["hardware_version"],
            "preferred_acs_id": device["acs_device_id"],
            "last_inform": _serialize_dt(device["last_inform"]),
            "status": device["status"],
        },
        "identity_count": len(items),
        "identities": items,
    }

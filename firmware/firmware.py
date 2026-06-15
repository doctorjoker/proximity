from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.device import Device
from app.services.genieacs import GenieACSClient


router = APIRouter(
    prefix="/api/v1/firmware",
    tags=["firmware"],
)


class FirmwareUpgradeRequest(BaseModel):
    firmware_id: str | None = None


class FirmwareMassUpgradeRequest(BaseModel):
    firmware_id: str
    device_ids: list[str]
    created_by: str | None = "BACKOFFICE"

@router.get("/health")
async def firmware_health():
    return {
        "success": True,
        "module": "firmware",
    }


@router.get("/catalog")
async def firmware_catalog(
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT
                id,
                vendor,
                model,
                version,
                filename,
                url,
                checksum,
                file_size,
                stable,
                mandatory,
                notes,
                created_at,
                updated_at
            FROM firmware_catalog
            ORDER BY vendor, model, version
        """)
    ).mappings().all()

    return {
        "success": True,
        "count": len(rows),
        "items": [dict(row) for row in rows],
    }


@router.post("/devices/{device_id}/upgrade")
async def firmware_upgrade(
    device_id: str,
    payload: FirmwareUpgradeRequest | None = None,
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

    firmware = None

    if payload and payload.firmware_id:
        firmware = db.execute(
            text("""
                SELECT
                    id,
                    vendor,
                    model,
                    version,
                    filename,
                    url
                FROM firmware_catalog
                WHERE id = :firmware_id
            """),
            {"firmware_id": payload.firmware_id},
        ).mappings().first()
    else:
        firmware = db.execute(
            text("""
                SELECT
                    id,
                    vendor,
                    model,
                    version,
                    filename,
                    url
                FROM firmware_catalog
                WHERE LOWER(vendor) = LOWER(:vendor)
                  AND LOWER(model) = LOWER(:model)
                  AND stable = true
                ORDER BY created_at DESC
                LIMIT 1
            """),
            {
                "vendor": device.manufacturer or "",
                "model": device.model or "",
            },
        ).mappings().first()

    if not firmware:
        raise HTTPException(
            status_code=404,
            detail="Firmware not found for this device/model",
        )

    client = GenieACSClient()

    result = await client.create_task(
        device.acs_device_id,
        {
            "name": "download",
            "fileType": "1 Firmware Upgrade Image",
            "fileName": firmware["filename"],
            "targetFileName": firmware["filename"],
            "url": firmware["url"],
        },
    )

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "firmware": dict(firmware),
        "result": result,
    }


@router.post("/campaigns/mass-upgrade")
async def firmware_mass_upgrade(
    payload: FirmwareMassUpgradeRequest,
    db: Session = Depends(get_db),
):
    firmware = db.execute(
        text("""
            SELECT
                id,
                vendor,
                model,
                version,
                filename,
                url
            FROM firmware_catalog
            WHERE id = :firmware_id
        """),
        {"firmware_id": payload.firmware_id},
    ).mappings().first()

    if not firmware:
        raise HTTPException(
            status_code=404,
            detail="Firmware not found",
        )

    client = GenieACSClient()

    jobs = []
    created = 0
    failed = 0

    for index, device_id in enumerate(payload.device_ids, start=1):
        device = (
            db.query(Device)
            .filter(Device.id == device_id)
            .first()
        )

        if not device:
            failed += 1
            jobs.append({
                "device_id": device_id,
                "success": False,
                "status": "FAILED",
                "error": "Device not found",
            })
            continue

        job_code = f"FW-{str(device.id)[:8]}-{index}"

        try:
            result = await client.create_task(
                device.acs_device_id,
                {
                    "name": "download",
                    "fileType": "1 Firmware Upgrade Image",
                    "fileName": firmware["filename"],
                    "targetFileName": firmware["filename"],
                    "url": firmware["url"],
                },
            )

            task_id = None
            if isinstance(result, dict):
                task_id = result.get("_id") or result.get("id") or result.get("task_id")

            db.execute(
                text("""
                    INSERT INTO firmware_upgrade_jobs (
                        job_code,
                        firmware_id,
                        device_id,
                        acs_device_id,
                        task_id,
                        status,
                        created_by,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        :job_code,
                        :firmware_id,
                        :device_id,
                        :acs_device_id,
                        :task_id,
                        'TASK_CREATED',
                        :created_by,
                        NOW(),
                        NOW()
                    )
                """),
                {
                    "job_code": job_code,
                    "firmware_id": firmware["id"],
                    "device_id": str(device.id),
                    "acs_device_id": device.acs_device_id,
                    "task_id": task_id,
                    "created_by": payload.created_by,
                },
            )
            db.commit()

            created += 1
            jobs.append({
                "device_id": str(device.id),
                "acs_device_id": device.acs_device_id,
                "success": True,
                "status": "TASK_CREATED",
                "task_id": task_id,
                "result": result,
            })

        except Exception as exc:
            db.rollback()
            failed += 1
            error_message = str(exc)

            try:
                db.execute(
                    text("""
                        INSERT INTO firmware_upgrade_jobs (
                            job_code,
                            firmware_id,
                            device_id,
                            acs_device_id,
                            status,
                            error_message,
                            created_by,
                            created_at,
                            updated_at
                        )
                        VALUES (
                            :job_code,
                            :firmware_id,
                            :device_id,
                            :acs_device_id,
                            'FAILED',
                            :error_message,
                            :created_by,
                            NOW(),
                            NOW()
                        )
                    """),
                    {
                        "job_code": job_code,
                        "firmware_id": firmware["id"],
                        "device_id": str(device.id),
                        "acs_device_id": device.acs_device_id,
                        "error_message": error_message,
                        "created_by": payload.created_by,
                    },
                )
                db.commit()
            except Exception:
                db.rollback()

            jobs.append({
                "device_id": str(device.id),
                "acs_device_id": device.acs_device_id,
                "success": False,
                "status": "FAILED",
                "error": error_message,
            })

    return {
        "success": True,
        "firmware_id": str(firmware["id"]),
        "total": len(payload.device_ids),
        "created": created,
        "failed": failed,
        "jobs": jobs,
    }


@router.get("/jobs")
async def firmware_jobs(
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT
                id,
                job_code,
                firmware_id,
                device_id,
                acs_device_id,
                task_id,
                status,
                error_message,
                created_by,
                created_at,
                updated_at
            FROM firmware_upgrade_jobs
            ORDER BY created_at DESC
        """)
    ).mappings().all()

    return {
        "success": True,
        "count": len(rows),
        "items": [dict(row) for row in rows],
    }

@router.get("/jobs/{job_code}")
async def firmware_job_detail(
    job_code: str,
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("""
            SELECT *
            FROM firmware_upgrade_jobs
            WHERE job_code = :job_code
        """),
        {"job_code": job_code},
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    return {
        "success": True,
        "item": dict(row),
    }

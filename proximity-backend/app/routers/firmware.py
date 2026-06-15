from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from pathlib import Path
import re
import shutil
import uuid

from app.db.session import get_db
from app.models.device import Device
from app.services.genieacs import GenieACSClient


router = APIRouter(
    prefix="/api/v1/firmware",
    tags=["firmware"],
)


FIRMWARE_STORAGE_DIR = Path("/opt/proximity/firmware")
FIRMWARE_PUBLIC_BASE_URL = "https://acs.speednetwifi.it/firmware"


def _safe_slug(value: str) -> str:
    value = (value or "").strip()
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", value)
    return value.strip("-") or "unknown"


class FirmwareUpgradeRequest(BaseModel):
    firmware_id: str | None = None


@router.get("/health")
async def firmware_health():
    return {
        "success": True,
        "module": "firmware",
    }


@router.post("/upload")
async def firmware_upload(
    vendor: str = Form(...),
    model: str = Form(...),
    version: str = Form(...),
    stable: bool = Form(True),
    mandatory: bool = Form(False),
    notes: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing firmware file")

    original_name = _safe_slug(file.filename)
    vendor_slug = _safe_slug(vendor)
    model_slug = _safe_slug(model)
    version_slug = _safe_slug(version)

    suffix = Path(original_name).suffix or ".bin"
    stored_filename = f"{vendor_slug}_{model_slug}_{version_slug}_{uuid.uuid4().hex[:8]}{suffix}"

    FIRMWARE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    target_path = FIRMWARE_STORAGE_DIR / stored_filename

    try:
        with target_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Firmware file save failed: {exc}") from exc

    public_url = f"{FIRMWARE_PUBLIC_BASE_URL}/{stored_filename}"
    file_size = target_path.stat().st_size

    try:
        row = db.execute(
            text("""
                INSERT INTO firmware_catalog (
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
                )
                VALUES (
                    :vendor,
                    :model,
                    :version,
                    :filename,
                    :url,
                    NULL,
                    :file_size,
                    :stable,
                    :mandatory,
                    :notes,
                    NOW(),
                    NOW()
                )
                RETURNING id
            """),
            {
                "vendor": vendor,
                "model": model,
                "version": version,
                "filename": stored_filename,
                "url": public_url,
                "file_size": file_size,
                "stable": stable,
                "mandatory": mandatory,
                "notes": notes,
            },
        ).mappings().first()
        db.commit()
    except Exception as exc:
        db.rollback()
        try:
            target_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Firmware catalog insert failed: {exc}") from exc

    return {
        "success": True,
        "firmware_id": str(row["id"]),
        "filename": stored_filename,
        "url": public_url,
        "file_size": file_size,
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



@router.delete("/catalog/{firmware_id}")
async def delete_firmware_catalog_item(
    firmware_id: str,
    db: Session = Depends(get_db),
):
    firmware = db.execute(
        text("""
            SELECT id, version, filename, url
            FROM firmware_catalog
            WHERE id = :firmware_id
        """),
        {"firmware_id": firmware_id},
    ).mappings().first()

    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    running_usage = db.execute(
        text("""
            SELECT COUNT(*) AS count
            FROM firmware_upgrade_jobs
            WHERE firmware_id = :firmware_id
              AND COALESCE(status, '') IN ('RUNNING', 'PENDING', 'TASK_CREATED', 'QUEUED')
        """),
        {"firmware_id": firmware_id},
    ).mappings().first()

    if running_usage and int(running_usage["count"] or 0) > 0:
        raise HTTPException(
            status_code=409,
            detail="FIRMWARE_IN_USE",
        )

    filename = firmware["filename"]
    file_deleted = False

    try:
        db.execute(
            text("""
                DELETE FROM firmware_catalog
                WHERE id = :firmware_id
            """),
            {"firmware_id": firmware_id},
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Firmware delete failed: {exc}") from exc

    if filename:
        try:
            target_path = FIRMWARE_STORAGE_DIR / filename
            if target_path.exists() and target_path.is_file():
                target_path.unlink()
                file_deleted = True
        except Exception as exc:
            # The DB record is already deleted. Return success with a warning so the UI can continue.
            return {
                "success": True,
                "deleted": True,
                "file_deleted": False,
                "warning": f"Catalog deleted but file cleanup failed: {exc}",
                "firmware_id": firmware_id,
            }

    return {
        "success": True,
        "deleted": True,
        "file_deleted": file_deleted,
        "firmware_id": firmware_id,
        "filename": filename,
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


class FirmwareMassUpgradeRequest(BaseModel):
    firmware_id: str
    device_ids: list[str]
    created_by: str | None = "BACKOFFICE"


@router.post("/campaigns/mass-upgrade")
async def firmware_mass_upgrade(
    payload: FirmwareMassUpgradeRequest,
    db: Session = Depends(get_db),
):
    firmware = db.execute(
        text("""
            SELECT id, vendor, model, version, filename, url
            FROM firmware_catalog
            WHERE id = :firmware_id
        """),
        {"firmware_id": payload.firmware_id},
    ).mappings().first()

    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    client = GenieACSClient()
    jobs = []
    created = 0
    failed = 0

    for index, device_id in enumerate(payload.device_ids, start=1):
        device = db.query(Device).filter(Device.id == device_id).first()

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

            task_id = result.get("_id") or result.get("id") or result.get("task_id")

            db.execute(
                text("""
                    INSERT INTO firmware_upgrade_jobs (
                        job_code, firmware_id, device_id, acs_device_id,
                        task_id, status, created_by, created_at, updated_at
                    )
                    VALUES (
                        :job_code, :firmware_id, :device_id, :acs_device_id,
                        :task_id, 'TASK_CREATED', :created_by, NOW(), NOW()
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
            jobs.append({
                "device_id": str(device.id),
                "acs_device_id": device.acs_device_id,
                "success": False,
                "status": "FAILED",
                "error": str(exc),
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

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db

from .repository import get_profile, list_profiles, update_profile, upsert_profile
from .schemas import ProfileUpdateRequest, QualificationRequest
from .service import QualificationError, qualify
from app.models.device import Device
from app.services.genieacs import GenieACSClient
from .resolver import CPEProfileNotFoundError, resolve_profile
from .telemetry import normalize_device_telemetry
from .digital_twin import build_digital_twin_contract

router = APIRouter(prefix="/api/v1/cpe-profiles", tags=["CPE Profile Studio"])


@router.post("/qualify/{acs_device_id}")
async def qualify_device(
    acs_device_id: str,
    payload: QualificationRequest = QualificationRequest(),
    db: Session = Depends(get_db),
):
    try:
        report = await qualify(acs_device_id, payload.profile_code)
    except QualificationError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Errore GenieACS NBI: {exc}") from exc

    profile_id = None
    persisted = False
    if payload.persist:
        try:
            profile_id = upsert_profile(db, report, acs_device_id, payload.notes)
            persisted = True
        except Exception as exc:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Qualifica completata ma persistenza fallita: {exc}") from exc

    return {
        "acs_device_id": acs_device_id,
        "found": True,
        **report,
        "persisted": persisted,
        "profile_id": profile_id,
    }


@router.get("")
def profiles(db: Session = Depends(get_db)):
    return {"items": list_profiles(db)}


@router.get("/{profile_code}")
def profile(profile_code: str, db: Session = Depends(get_db)):
    item = get_profile(db, profile_code)
    if not item:
        raise HTTPException(status_code=404, detail="Profilo CPE non trovato")
    return item


@router.put("/{profile_code}")
def edit_profile(profile_code: str, payload: ProfileUpdateRequest, db: Session = Depends(get_db)):
    item = update_profile(db, profile_code, payload.model_dump(exclude_unset=True))
    if not item:
        raise HTTPException(status_code=404, detail="Profilo CPE non trovato")
    return item


@router.get("/devices/{device_id}/telemetry")
def device_driver_telemetry(device_id: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    vendor = getattr(device, "manufacturer", None) or getattr(device, "vendor", None)
    product_class = getattr(device, "product_class", None) or getattr(device, "model", None)

    try:
        profile = resolve_profile(vendor, product_class, required=True)
    except CPEProfileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    payload = getattr(device, "raw_acs_payload", None) or {}
    telemetry = normalize_device_telemetry(payload, profile)

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": getattr(device, "acs_device_id", None),
        **telemetry,
    }


@router.post("/devices/{device_id}/telemetry/refresh")
async def refresh_device_driver_telemetry(
    device_id: str,
    wait_seconds: int = 20,
    db: Session = Depends(get_db),
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    vendor = getattr(device, "manufacturer", None) or getattr(device, "vendor", None)
    product_class = getattr(device, "product_class", None) or getattr(device, "model", None)

    try:
        profile = resolve_profile(vendor, product_class, required=True)
    except CPEProfileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    current_payload = getattr(device, "raw_acs_payload", None) or {}
    current_telemetry = normalize_device_telemetry(current_payload, profile)
    object_names = current_telemetry.get("refresh", {}).get("object_names") or [
        profile.refresh_root,
    ]

    client = GenieACSClient()
    refresh_result = await client.refresh_objects(
        acs_device_id=device.acs_device_id,
        object_names=object_names,
        wait_seconds=wait_seconds,
    )

    refreshed_payload = refresh_result.get("payload") or current_payload
    device.raw_acs_payload = refreshed_payload
    db.add(device)
    db.commit()

    telemetry = normalize_device_telemetry(refreshed_payload, profile)

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "refresh_result": {
            "status": refresh_result.get("status"),
            "changed": refresh_result.get("changed"),
            "timed_out": refresh_result.get("timed_out"),
            "object_names": refresh_result.get("object_names"),
        },
        "telemetry": {
            "success": True,
            "device_id": str(device.id),
            "acs_device_id": device.acs_device_id,
            **telemetry,
        },
    }


@router.get("/devices/{device_id}/diagnostics-capabilities")
def device_driver_diagnostics_capabilities(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    vendor = getattr(device, "manufacturer", None) or getattr(device, "vendor", None)
    product_class = getattr(device, "product_class", None) or getattr(device, "model", None)

    try:
        profile = resolve_profile(vendor, product_class, required=True)
    except CPEProfileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    diagnostics = {
        item.code: {
            "code": item.code,
            "support": item.support,
            "qualification": item.qualification,
            "execution": item.execution,
            "aliases": list(item.aliases),
            "reason": item.reason,
            "timeout_seconds": item.timeout_seconds,
            "metadata": item.metadata,
        }
        for item in profile.diagnostics
    }

    return {
        "success": True,
        "engine": "Device Driver Diagnostics Contract",
        "version": "EUREKA35.1.0",
        "device_id": str(device.id),
        "acs_device_id": getattr(device, "acs_device_id", None),
        "driver": {
            "vendor": profile.vendor,
            "product_class": profile.product_class,
            "data_model": profile.data_model,
        },
        "diagnostics": diagnostics,
    }


@router.get("/devices/{device_id}/digital-twin")
def device_driver_digital_twin(device_id: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    vendor = getattr(device, "manufacturer", None) or getattr(device, "vendor", None)
    product_class = getattr(device, "product_class", None) or getattr(device, "model", None)

    try:
        profile = resolve_profile(vendor, product_class, required=True)
    except CPEProfileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": getattr(device, "acs_device_id", None),
        **build_digital_twin_contract(
            profile,
            getattr(device, "raw_acs_payload", None) or {},
        ),
    }

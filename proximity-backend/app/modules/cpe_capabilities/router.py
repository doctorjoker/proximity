from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db

from .qualification import XC220_QUALIFICATIONS, qualification_score
from .service import (
    engine_info,
    list_capability_profiles,
    resolve_device_capabilities,
)


router = APIRouter(
    prefix="/api/v1/cpe-capabilities",
    tags=["CPE Capabilities"],
)


@router.get("/engine")
def capability_engine():
    return engine_info()


@router.get("/profiles")
def capability_profiles():
    items = list_capability_profiles()
    return {
        "success": True,
        "count": len(items),
        "items": items,
    }


@router.get("/devices/{device_id}")
def device_capabilities(device_id: str, db: Session = Depends(get_db)):
    try:
        return resolve_device_capabilities(db, device_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# EUREKA34.2.0 qualification endpoints
@router.get("/profiles/{profile_code}/qualifications")
def profile_qualifications(profile_code: str):
    if profile_code != "tplink_xc220_g3v":
        raise HTTPException(status_code=404, detail="Qualification profile not found")

    items = [item.to_dict() for item in XC220_QUALIFICATIONS.values()]
    return {
        "success": True,
        "engine": "CPE Capability Qualification Engine",
        "version": "EUREKA34.2.0",
        "profile_code": profile_code,
        "score": qualification_score(XC220_QUALIFICATIONS.values()),
        "items": items,
    }


@router.get("/devices/{device_id}/qualifications")
def device_qualifications(device_id: str, db: Session = Depends(get_db)):
    report = resolve_device_capabilities(db, device_id)
    if not report:
        raise HTTPException(status_code=404, detail="Device not found")

    profile = report.get("profile") or {}
    profile_code = profile.get("code")
    if profile_code != "tplink_xc220_g3v":
        return {
            "success": True,
            "engine": "CPE Capability Qualification Engine",
            "version": "EUREKA34.2.0",
            "device_id": device_id,
            "profile_code": profile_code,
            "qualification_status": "UNQUALIFIED",
            "score": {"score": 0, "qualified": 0, "total": 0},
            "items": [],
        }

    items = [item.to_dict() for item in XC220_QUALIFICATIONS.values()]
    return {
        "success": True,
        "engine": "CPE Capability Qualification Engine",
        "version": "EUREKA34.2.0",
        "device_id": device_id,
        "profile_code": profile_code,
        "qualification_status": "QUALIFIED",
        "score": qualification_score(XC220_QUALIFICATIONS.values()),
        "items": items,
    }

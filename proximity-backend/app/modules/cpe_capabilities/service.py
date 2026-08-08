from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.device import Device

from .models import CapabilityProfile, flatten_codes
from .registry import get_profiles


ENGINE_NAME = "CPE Capability Framework"
ENGINE_VERSION = "EUREKA34.0.0"


def _serialize_device(device: Device) -> Dict[str, Any]:
    return {
        "id": str(device.id),
        "device_code": device.device_code,
        "acs_device_id": device.acs_device_id,
        "manufacturer": device.manufacturer,
        "model": device.model,
        "product_class": device.product_class,
        "serial_number": device.serial_number,
        "software_version": device.software_version,
        "hardware_version": device.hardware_version,
    }


def _match_profile(device: Device) -> Optional[CapabilityProfile]:
    for profile in get_profiles():
        if profile.matches(
            vendor=device.manufacturer,
            model=device.model,
            product_class=device.product_class,
        ):
            return profile
    return None


def _generic_capabilities() -> Dict[str, Dict[str, Any]]:
    return {
        code: {
            "code": code,
            "supported": False,
            "qualified": False,
            "reason": "Capability non ancora qualificata per questo modello",
            "metadata": {},
        }
        for code in flatten_codes(get_profiles())
    }


def engine_info() -> Dict[str, Any]:
    profiles = get_profiles()
    return {
        "success": True,
        "engine": ENGINE_NAME,
        "version": ENGINE_VERSION,
        "profile_count": len(profiles),
        "capability_codes": flatten_codes(profiles),
    }


def list_capability_profiles() -> list[Dict[str, Any]]:
    return [profile.to_dict() for profile in get_profiles()]


def resolve_device_capabilities(db: Session, device_id: str) -> Dict[str, Any]:
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise LookupError("Device not found")

    profile = _match_profile(device)
    if profile:
        capabilities = profile.capability_map()
        resolution = "PROFILE_MATCH"
        qualification_status = profile.metadata.get("qualification_status", "QUALIFIED")
        profile_payload: Optional[Dict[str, Any]] = profile.to_dict()
    else:
        capabilities = _generic_capabilities()
        resolution = "UNQUALIFIED_MODEL"
        qualification_status = "UNQUALIFIED"
        profile_payload = None

    supported = sorted(code for code, item in capabilities.items() if item.get("supported"))
    unsupported = sorted(code for code, item in capabilities.items() if not item.get("supported"))

    return {
        "success": True,
        "engine": ENGINE_NAME,
        "version": ENGINE_VERSION,
        "resolution": resolution,
        "qualification_status": qualification_status,
        "device": _serialize_device(device),
        "profile": profile_payload,
        "capabilities": capabilities,
        "supported": supported,
        "unsupported": unsupported,
    }

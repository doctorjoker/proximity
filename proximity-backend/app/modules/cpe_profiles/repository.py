import json
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session


def upsert_profile(db: Session, report: Dict[str, Any], acs_device_id: str, notes: Optional[str]) -> int:
    catalog = db.execute(text("""
        INSERT INTO cpe_catalog (vendor, model, product_class, oui, hardware_revision, notes)
        VALUES (:vendor, :model, :product_class, :oui, :hardware, :notes)
        ON CONFLICT (vendor, model, product_class, COALESCE(hardware_revision, ''))
        DO UPDATE SET oui = EXCLUDED.oui, updated_at = now()
        RETURNING id
    """), {
        "vendor": report.get("manufacturer") or "Unknown",
        "model": report.get("model") or "Unknown",
        "product_class": report.get("product_class") or "Unknown",
        "oui": report.get("oui"),
        "hardware": report.get("hardware_version"),
        "notes": notes,
    }).scalar_one()

    profile_id = db.execute(text("""
        INSERT INTO cpe_profiles (
            profile_code, catalog_id, cwmp_root, data_model, firmware_version,
            qualification_status, capabilities, parameter_mapping,
            vendor_extensions, notes
        ) VALUES (
            :code, :catalog_id, :root, :data_model, :firmware,
            :status, CAST(:capabilities AS jsonb), CAST(:mapping AS jsonb),
            CAST(:extensions AS jsonb), :notes
        )
        ON CONFLICT (profile_code)
        DO UPDATE SET
            catalog_id = EXCLUDED.catalog_id,
            cwmp_root = EXCLUDED.cwmp_root,
            data_model = EXCLUDED.data_model,
            firmware_version = EXCLUDED.firmware_version,
            capabilities = EXCLUDED.capabilities,
            parameter_mapping = EXCLUDED.parameter_mapping,
            vendor_extensions = EXCLUDED.vendor_extensions,
            notes = COALESCE(EXCLUDED.notes, cpe_profiles.notes),
            updated_at = now()
        RETURNING id
    """), {
        "code": report["profile_code"],
        "catalog_id": catalog,
        "root": report.get("root_object"),
        "data_model": report.get("data_model"),
        "firmware": report.get("firmware_version"),
        "status": report.get("qualification_status", "DRAFT"),
        "capabilities": json.dumps(report.get("capabilities", {})),
        "mapping": json.dumps(report.get("parameter_mapping", {})),
        "extensions": json.dumps(report.get("vendor_extensions", [])),
        "notes": notes,
    }).scalar_one()

    db.execute(text("""
        INSERT INTO cpe_profile_tests (
            profile_id, acs_device_id, firmware_version, result, executed_at
        ) VALUES (
            :profile_id, :acs_device_id, :firmware,
            CAST(:result AS jsonb), now()
        )
    """), {
        "profile_id": profile_id,
        "acs_device_id": acs_device_id,
        "firmware": report.get("firmware_version"),
        "result": json.dumps(report),
    })
    db.commit()
    return int(profile_id)


def list_profiles(db: Session) -> List[Dict[str, Any]]:
    rows = db.execute(text("""
        SELECT p.id, p.profile_code, p.cwmp_root, p.data_model,
               p.firmware_version, p.qualification_status, p.capabilities,
               p.updated_at, c.vendor, c.model, c.product_class, c.hardware_revision
        FROM cpe_profiles p
        JOIN cpe_catalog c ON c.id = p.catalog_id
        ORDER BY c.vendor, c.model, p.updated_at DESC
    """)).mappings().all()
    return [dict(row) for row in rows]


def get_profile(db: Session, profile_code: str) -> Optional[Dict[str, Any]]:
    row = db.execute(text("""
        SELECT p.*, c.vendor, c.model, c.product_class, c.oui, c.hardware_revision
        FROM cpe_profiles p
        JOIN cpe_catalog c ON c.id = p.catalog_id
        WHERE p.profile_code = :code
    """), {"code": profile_code}).mappings().first()
    return dict(row) if row else None


def update_profile(db: Session, profile_code: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    current = get_profile(db, profile_code)
    if not current:
        return None
    db.execute(text("""
        UPDATE cpe_profiles SET
            qualification_status = COALESCE(:status, qualification_status),
            capabilities = COALESCE(CAST(:capabilities AS jsonb), capabilities),
            parameter_mapping = COALESCE(CAST(:mapping AS jsonb), parameter_mapping),
            notes = COALESCE(:notes, notes),
            updated_at = now()
        WHERE profile_code = :code
    """), {
        "code": profile_code,
        "status": payload.get("qualification_status"),
        "capabilities": json.dumps(payload["capabilities"]) if payload.get("capabilities") is not None else None,
        "mapping": json.dumps(payload["parameter_mapping"]) if payload.get("parameter_mapping") is not None else None,
        "notes": payload.get("notes"),
    })
    db.commit()
    return get_profile(db, profile_code)

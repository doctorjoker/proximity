from fastapi import APIRouter, HTTPException

from .phase_schemas import (
    PhaseCreateRequest,
    PhaseReorderRequest,
    PhaseUpdateRequest,
)
from .phase_service import (
    service_create_phase,
    service_delete_phase,
    service_get_phase,
    service_list_phases,
    service_reorder_phases,
    service_update_phase,
)


router = APIRouter(
    prefix="/api/v1/procedures/{code}/versions/{version}/phases",
    tags=["Procedure Phases"],
)


@router.get("")
def api_list_phases(code: str, version: str):
    items = service_list_phases(code, version)
    if items is None:
        raise HTTPException(status_code=404, detail="Procedure version not found")

    return {
        "success": True,
        "procedure_code": code,
        "version": version,
        "items": items,
    }


@router.get("/{phase_id}")
def api_get_phase(code: str, version: str, phase_id: int):
    item = service_get_phase(code, version, phase_id)
    if not item:
        raise HTTPException(status_code=404, detail="Phase not found")

    return {
        "success": True,
        "item": item,
    }


@router.post("")
def api_create_phase(code: str, version: str, payload: PhaseCreateRequest):
    item = service_create_phase(code, version, payload)
    if not item:
        raise HTTPException(status_code=404, detail="Procedure version not found")

    return {
        "success": True,
        "item": item,
    }


@router.put("/{phase_id}")
def api_update_phase(
    code: str,
    version: str,
    phase_id: int,
    payload: PhaseUpdateRequest,
):
    item = service_update_phase(code, version, phase_id, payload)
    if not item:
        raise HTTPException(status_code=404, detail="Phase not found")

    return {
        "success": True,
        "item": item,
    }


@router.delete("/{phase_id}")
def api_delete_phase(code: str, version: str, phase_id: int):
    item = service_delete_phase(code, version, phase_id)
    if not item:
        raise HTTPException(status_code=404, detail="Phase not found")

    return {
        "success": True,
        "deleted": item,
    }


@router.patch("/reorder")
def api_reorder_phases(code: str, version: str, payload: PhaseReorderRequest):
    items = service_reorder_phases(code, version, payload)
    if items is None:
        raise HTTPException(status_code=404, detail="Procedure version not found")

    return {
        "success": True,
        "procedure_code": code,
        "version": version,
        "items": items,
    }

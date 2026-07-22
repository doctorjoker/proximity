from fastapi import APIRouter, HTTPException

from .schemas import (
    ProcedureCreate,
    ProcedureDesignerSaveRequest,
    ProcedurePhaseCreateRequest,
    ProcedurePhaseUpdateRequest,
    ProcedureTestRequest,
)
from .service import (
    service_create_phase,
    service_create_procedure,
    service_delete_phase,
    service_get_designer,
    service_get_procedure,
    service_get_version_detail,
    service_list_procedures,
    service_list_versions,
    service_save_designer,
    service_test_procedure,
    service_update_phase,
)


router = APIRouter(prefix="/api/v1/procedures", tags=["Procedures"])


@router.get("")
def api_list_procedures():
    return {
        "success": True,
        "items": service_list_procedures(),
    }


@router.post("")
def api_create_procedure(payload: ProcedureCreate):
    item = service_create_procedure(payload)
    return {
        "success": True,
        "item": item,
    }


@router.get("/{code}")
def api_get_procedure(code: str):
    item = service_get_procedure(code)
    if not item:
        raise HTTPException(status_code=404, detail="Procedure not found")

    return {
        "success": True,
        "item": item,
    }


@router.get("/{code}/versions")
def api_list_versions(code: str):
    item = service_get_procedure(code)
    if not item:
        raise HTTPException(status_code=404, detail="Procedure not found")

    return {
        "success": True,
        "procedure": item,
        "items": service_list_versions(code),
    }


@router.get("/{code}/versions/{version}")
def api_get_version_detail(code: str, version: str):
    detail = service_get_version_detail(code, version)
    if not detail:
        raise HTTPException(status_code=404, detail="Procedure version not found")

    return {
        "success": True,
        **detail,
    }


@router.get("/{code}/versions/{version}/designer")
def api_get_designer(code: str, version: str):
    detail = service_get_designer(code, version)
    if not detail:
        raise HTTPException(status_code=404, detail="Procedure version not found")

    return {
        "success": True,
        **detail,
    }


@router.put("/{code}/versions/{version}/designer")
def api_save_designer(
    code: str,
    version: str,
    payload: ProcedureDesignerSaveRequest,
):
    try:
        detail = service_save_designer(code, version, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not detail:
        raise HTTPException(status_code=404, detail="Procedure version not found")

    return {
        "success": True,
        **detail,
    }


@router.post("/{code}/versions/{version}/phases")
def api_create_phase(
    code: str,
    version: str,
    payload: ProcedurePhaseCreateRequest,
):
    try:
        node = service_create_phase(code, version, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if node is None:
        raise HTTPException(status_code=404, detail="Procedure version not found")

    return {
        "success": True,
        "node": node,
    }


@router.patch("/{code}/versions/{version}/phases/{phase_id}")
def api_update_phase(
    code: str,
    version: str,
    phase_id: int,
    payload: ProcedurePhaseUpdateRequest,
):
    try:
        node = service_update_phase(code, version, phase_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if node is None:
        raise HTTPException(status_code=404, detail="Procedure version not found")
    if node is False:
        raise HTTPException(status_code=404, detail="Procedure phase not found")

    return {
        "success": True,
        "node": node,
    }


@router.delete("/{code}/versions/{version}/phases/{phase_id}")
def api_delete_phase(code: str, version: str, phase_id: int):
    result = service_delete_phase(code, version, phase_id)

    if result is None:
        raise HTTPException(status_code=404, detail="Procedure version not found")
    if result is False:
        raise HTTPException(status_code=404, detail="Procedure phase not found")

    return {
        "success": True,
        "deleted": result,
    }


@router.post("/{code}/versions/{version}/test")
def api_test_procedure(code: str, version: str, payload: ProcedureTestRequest):
    result = service_test_procedure(code, version, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Procedure version not found")

    return {
        "success": True,
        **result,
    }

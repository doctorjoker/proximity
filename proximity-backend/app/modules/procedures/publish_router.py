from fastapi import APIRouter, HTTPException

from .publish_schemas import (
    ProcedureCloneRequest,
    ProcedurePublishRequest,
    ProcedureValidateRequest,
)
from .publish_service import (
    service_clone_version,
    service_publish_version,
    service_validate_version,
)


router = APIRouter(prefix="/api/v1/procedures", tags=["Procedure Publication"])


@router.post("/{code}/versions/{version}/validate")
def api_validate_version(
    code: str,
    version: str,
    payload: ProcedureValidateRequest = ProcedureValidateRequest(),
):
    result = service_validate_version(code, version, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Procedure version not found")

    return {
        "success": True,
        **result,
    }


@router.post("/{code}/versions/{version}/publish")
def api_publish_version(
    code: str,
    version: str,
    payload: ProcedurePublishRequest = ProcedurePublishRequest(),
):
    result = service_publish_version(code, version, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Procedure version not found")

    return {
        "success": True,
        **result,
    }


@router.post("/{code}/versions/{version}/clone")
def api_clone_version(
    code: str,
    version: str,
    payload: ProcedureCloneRequest = ProcedureCloneRequest(),
):
    result = service_clone_version(code, version, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Procedure version not found")

    return {
        "success": True,
        **result,
    }

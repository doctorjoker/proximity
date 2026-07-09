from fastapi import APIRouter

from .variable_schemas import VariableCreateRequest, VariableUpdateRequest
from .variable_service import (
    service_create_variable,
    service_delete_variable,
    service_list_variables,
    service_update_variable,
)


router = APIRouter(
    prefix="/api/v1/procedures",
    tags=["Procedure Variables"],
)


@router.get("/{code}/versions/{version}/variables")
def api_list_variables(code: str, version: str):
    items = service_list_variables(code, version)
    return {
        "success": True,
        "procedure_code": code,
        "version": version,
        "items": items,
    }


@router.post("/{code}/versions/{version}/variables")
def api_create_variable(
    code: str,
    version: str,
    payload: VariableCreateRequest,
):
    item = service_create_variable(code, version, payload)
    return {
        "success": True,
        "item": item,
    }


@router.put("/{code}/versions/{version}/variables/{variable_id}")
def api_update_variable(
    code: str,
    version: str,
    variable_id: int,
    payload: VariableUpdateRequest,
):
    item = service_update_variable(code, version, variable_id, payload)
    return {
        "success": True,
        "item": item,
    }


@router.delete("/{code}/versions/{version}/variables/{variable_id}")
def api_delete_variable(
    code: str,
    version: str,
    variable_id: int,
):
    item = service_delete_variable(code, version, variable_id)
    return {
        "success": True,
        "deleted": item,
    }

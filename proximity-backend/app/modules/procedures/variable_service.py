from fastapi import HTTPException

from .variable_repository import (
    create_variable,
    delete_variable,
    get_variable,
    get_version,
    list_variables,
    update_variable,
)


VALID_SCOPES = {"Input", "Output", "Secret", "Constant", "Costante"}
VALID_TYPES = {"string", "number", "integer", "boolean", "object", "array", "json", "secret"}


def _model_to_dict(payload):
    if hasattr(payload, "model_dump"):
        return payload.model_dump(exclude_unset=True)
    return payload.dict(exclude_unset=True)


def _normalize_payload(payload):
    data = _model_to_dict(payload)

    if "name" in data and data["name"] is not None:
        data["name"] = str(data["name"]).strip().upper()
        if not data["name"]:
            raise HTTPException(status_code=400, detail="Variable name is required")

    if "scope" in data and data["scope"] is not None:
        if data["scope"] not in VALID_SCOPES:
            raise HTTPException(status_code=400, detail="Invalid variable scope")

    if "type" in data and data["type"] is not None:
        if data["type"] not in VALID_TYPES:
            raise HTTPException(status_code=400, detail="Invalid variable type")

    return data


def service_list_variables(code: str, version: str):
    items = list_variables(code, version)
    if items is None:
        raise HTTPException(status_code=404, detail="Procedure version not found")
    return items


def service_create_variable(code: str, version: str, payload):
    if not get_version(code, version):
        raise HTTPException(status_code=404, detail="Procedure version not found")

    data = _normalize_payload(payload)
    item = create_variable(code, version, data)
    if not item:
        raise HTTPException(status_code=404, detail="Procedure version not found")
    return item


def service_update_variable(code: str, version: str, variable_id: int, payload):
    if not get_variable(code, version, variable_id):
        raise HTTPException(status_code=404, detail="Variable not found")

    data = _normalize_payload(payload)
    item = update_variable(code, version, variable_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Variable not found")
    return item


def service_delete_variable(code: str, version: str, variable_id: int):
    item = delete_variable(code, version, variable_id)
    if not item:
        raise HTTPException(status_code=404, detail="Variable not found")
    return item

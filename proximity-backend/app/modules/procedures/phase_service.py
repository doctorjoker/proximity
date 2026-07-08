from .phase_repository import (
    create_phase,
    delete_phase,
    get_phase,
    list_phases,
    reorder_phases,
    update_phase,
)


VALID_STATUSES = {"DRAFT", "READY", "ACTIVE", "DISABLED"}


def normalize_phase_payload(payload):
    data = payload.dict(exclude_unset=True)

    if "status" in data and data["status"]:
        data["status"] = data["status"].upper()
        if data["status"] not in VALID_STATUSES:
            data["status"] = "DRAFT"

    return data


def service_list_phases(code: str, version: str):
    return list_phases(code, version)


def service_get_phase(code: str, version: str, phase_id: int):
    return get_phase(code, version, phase_id)


def service_create_phase(code: str, version: str, payload):
    data = normalize_phase_payload(payload)
    return create_phase(code, version, data)


def service_update_phase(code: str, version: str, phase_id: int, payload):
    data = normalize_phase_payload(payload)
    return update_phase(code, version, phase_id, data)


def service_delete_phase(code: str, version: str, phase_id: int):
    return delete_phase(code, version, phase_id)


def service_reorder_phases(code: str, version: str, payload):
    items = [item.dict() for item in payload.items]
    return reorder_phases(code, version, items)

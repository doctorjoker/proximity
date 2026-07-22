from .repository import (
    create_procedure,
    create_test_execution,
    get_designer,
    get_procedure,
    get_version_detail,
    list_execution_logs,
    list_procedures,
    list_versions,
    save_designer,
)


def service_list_procedures():
    return list_procedures()


def service_get_procedure(code: str):
    return get_procedure(code)


def service_create_procedure(payload):
    return create_procedure(payload)


def service_list_versions(code: str):
    return list_versions(code)


def service_get_version_detail(code: str, version: str):
    return get_version_detail(code, version)


def service_get_designer(code: str, version: str):
    return get_designer(code, version)


def service_save_designer(code: str, version: str, payload):
    return save_designer(code, version, payload)


def service_test_procedure(code: str, version: str, payload):
    execution = create_test_execution(code, version, payload)
    if not execution:
        return None

    logs = list_execution_logs(execution["execution_code"])
    return {
        "execution": execution,
        "logs": logs,
    }

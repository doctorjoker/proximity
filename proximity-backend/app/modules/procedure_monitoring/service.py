from .repository import (
    build_timeline,
    get_execution_record,
    get_workflow_events,
    get_workflow_steps,
    list_execution_records,
)


def service_list_executions(limit: int = 100):
    return list_execution_records(limit=limit)


def service_get_execution(execution_code: str):
    return get_execution_record(execution_code)


def service_get_timeline(execution_code: str):
    return build_timeline(execution_code)


def service_get_events(execution_code: str):
    execution = get_execution_record(execution_code)
    if not execution:
        return None
    workflow_code = execution.get("workflow_code")
    return {
        "execution": execution,
        "items": get_workflow_events(workflow_code) if workflow_code else [],
    }


def service_get_steps(execution_code: str):
    execution = get_execution_record(execution_code)
    if not execution:
        return None
    workflow_code = execution.get("workflow_code")
    return {
        "execution": execution,
        "items": get_workflow_steps(workflow_code) if workflow_code else [],
    }

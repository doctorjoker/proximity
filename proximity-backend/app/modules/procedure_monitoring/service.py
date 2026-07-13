from typing import Any, Dict, List, Optional

from .repository import (
    get_execution,
    list_executions,
    list_persisted_phases,
    list_workflow_events,
    list_workflow_steps,
)


def service_list_executions(limit: int = 100):
    return list_executions(limit)


def service_get_execution(execution_code: str):
    return get_execution(execution_code)


def service_get_events(execution_code: str) -> Optional[Dict[str, Any]]:
    execution = get_execution(execution_code)
    if not execution:
        return None
    items = list_workflow_events(execution.get("workflow_code"))
    return {"execution": execution, "items": items}


def service_get_steps(execution_code: str) -> Optional[Dict[str, Any]]:
    execution = get_execution(execution_code)
    if not execution:
        return None
    items = list_workflow_steps(execution.get("workflow_code"))
    return {"execution": execution, "items": items}


def _phase_timeline_item(phase: Dict[str, Any]) -> Dict[str, Any]:
    error = phase.get("error_json") or {}
    description = None
    if phase.get("status") == "FAILED":
        description = (
            error.get("message")
            or error.get("error_message")
            or error.get("detail")
            or "Fase terminata con errore"
        )
    elif phase.get("handler_name"):
        description = f"Handler: {phase['handler_name']}"

    return {
        "type": "PROCEDURE_PHASE",
        "status": phase.get("status"),
        "title": phase.get("phase_name") or phase.get("phase_key"),
        "description": description,
        "timestamp": phase.get("started_at") or phase.get("created_at"),
        "metadata": {
            "persistence_id": phase.get("id"),
            "phase_key": phase.get("phase_key"),
            "phase_order": phase.get("phase_order"),
            "handler_name": phase.get("handler_name"),
            "duration_ms": phase.get("duration_ms"),
            "completed_at": phase.get("completed_at"),
        },
    }


def _workflow_event_timeline_item(event: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "type": event.get("event_type") or "WORKFLOW_EVENT",
        "status": event.get("event_status"),
        "title": event.get("title") or event.get("event_type") or "Workflow event",
        "description": event.get("description"),
        "timestamp": event.get("event_time") or event.get("created_at"),
        "metadata": event.get("metadata") or {},
    }


def service_get_timeline(execution_code: str) -> Optional[Dict[str, Any]]:
    execution = get_execution(execution_code)
    if not execution:
        return None

    phases = list_persisted_phases(execution_code) or []
    events = list_workflow_events(execution.get("workflow_code"))

    requested_item = {
        "type": "EXECUTION_REQUESTED",
        "status": execution.get("status") or "QUEUED",
        "title": "Execution requested",
        "description": f"Procedure execution {execution.get('execution_code')} requested",
        "timestamp": execution.get("requested_at") or execution.get("created_at"),
        "metadata": {
            "execution_code": execution.get("execution_code"),
            "workflow_code": execution.get("workflow_code"),
            "procedure_code": execution.get("procedure_code"),
            "procedure_version": execution.get("procedure_version"),
        },
    }

    items: List[Dict[str, Any]] = [requested_item]
    items.extend(_phase_timeline_item(item) for item in phases)
    items.extend(_workflow_event_timeline_item(item) for item in events)
    from datetime import datetime, timezone


    def _sort_timestamp(item):
        ts = item.get("timestamp")

        if ts is None:
            return datetime.min.replace(tzinfo=timezone.utc)

        if isinstance(ts, datetime):
            if ts.tzinfo is None:
                return ts.replace(tzinfo=timezone.utc)
            return ts

        if isinstance(ts, str):
            ts = ts.replace("Z", "+00:00")
            dt = datetime.fromisoformat(ts)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt

        return datetime.min.replace(tzinfo=timezone.utc)


    items.sort(key=_sort_timestamp)

    return {
        "execution": execution,
        "items": items,
        "events_count": len(events),
        "phases_count": len(phases),
    }


def service_get_phases(execution_code: str) -> Optional[Dict[str, Any]]:
    execution = get_execution(execution_code)
    if not execution:
        return None
    phases = list_persisted_phases(execution_code) or []
    return {"execution": execution, "items": phases}

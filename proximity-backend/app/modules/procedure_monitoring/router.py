from fastapi import APIRouter, HTTPException, Query

from .service import (
    service_get_events,
    service_get_execution,
    service_get_steps,
    service_get_timeline,
    service_list_executions,
)


router = APIRouter(prefix="/api/v1/procedure-executions", tags=["Procedure Monitoring"])


@router.get("")
def api_list_executions(limit: int = Query(default=100, ge=1, le=500)):
    return {
        "success": True,
        "items": service_list_executions(limit=limit),
    }


@router.get("/{execution_code}")
def api_get_execution(execution_code: str):
    item = service_get_execution(execution_code)
    if not item:
        raise HTTPException(status_code=404, detail="Execution not found")
    return {
        "success": True,
        "item": item,
    }


@router.get("/{execution_code}/timeline")
def api_get_timeline(execution_code: str):
    result = service_get_timeline(execution_code)
    if not result:
        raise HTTPException(status_code=404, detail="Execution not found")
    return {
        "success": True,
        **result,
    }


@router.get("/{execution_code}/events")
def api_get_events(execution_code: str):
    result = service_get_events(execution_code)
    if not result:
        raise HTTPException(status_code=404, detail="Execution not found")
    return {
        "success": True,
        **result,
    }


@router.get("/{execution_code}/steps")
def api_get_steps(execution_code: str):
    result = service_get_steps(execution_code)
    if not result:
        raise HTTPException(status_code=404, detail="Execution not found")
    return {
        "success": True,
        **result,
    }

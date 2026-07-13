from fastapi import APIRouter, HTTPException, Query

from .service import (
    service_get_events,
    service_get_execution,
    service_get_phases,
    service_get_steps,
    service_get_timeline,
    service_list_executions,
)


router = APIRouter(tags=["Procedure Monitoring"])


@router.get("/api/v1/procedure-executions")
def api_list_executions(limit: int = Query(default=100, ge=1, le=500)):
    return {"success": True, "items": service_list_executions(limit)}


@router.get("/api/v1/procedure-executions/{execution_code}")
def api_get_execution(execution_code: str):
    item = service_get_execution(execution_code)
    if not item:
        raise HTTPException(status_code=404, detail="Procedure execution not found")
    return {"success": True, "item": item}


@router.get("/api/v1/procedure-executions/{execution_code}/timeline")
def api_get_timeline(execution_code: str):
    result = service_get_timeline(execution_code)
    if not result:
        raise HTTPException(status_code=404, detail="Procedure execution not found")
    return {"success": True, **result}


@router.get("/api/v1/procedure-executions/{execution_code}/events")
def api_get_events(execution_code: str):
    result = service_get_events(execution_code)
    if not result:
        raise HTTPException(status_code=404, detail="Procedure execution not found")
    return {"success": True, **result}


@router.get("/api/v1/procedure-executions/{execution_code}/steps")
def api_get_steps(execution_code: str):
    result = service_get_steps(execution_code)
    if not result:
        raise HTTPException(status_code=404, detail="Procedure execution not found")
    return {"success": True, **result}


@router.get("/api/v1/procedure-executions/{execution_code}/phases")
def api_get_phases(execution_code: str):
    result = service_get_phases(execution_code)
    if not result:
        raise HTTPException(status_code=404, detail="Procedure execution not found")
    return {"success": True, **result}

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

# EUREKA41.0.5 ROUTE OWNERSHIP CLEANUP






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

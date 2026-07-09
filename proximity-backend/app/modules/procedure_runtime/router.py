from fastapi import APIRouter, HTTPException, Query

from .schemas import ProcedureExecuteRequest
from .service import (
    service_execute_procedure,
    service_get_execution,
    service_list_executions,
)


router = APIRouter(tags=["Procedure Runtime"])


@router.post("/api/v1/procedures/{code}/versions/{version}/execute")
async def api_execute_procedure(
    code: str,
    version: str,
    payload: ProcedureExecuteRequest,
):
    result = await service_execute_procedure(code, version, payload)

    if result is None:
        raise HTTPException(status_code=404, detail="Procedure version not found")

    if result.get("success") is False and result.get("status_code"):
        raise HTTPException(
            status_code=result["status_code"],
            detail=result.get("detail", "Procedure execution failed"),
        )

    return result


@router.get("/api/v1/procedure-executions")
def api_list_procedure_executions(limit: int = Query(default=100, ge=1, le=500)):
    return {
        "success": True,
        "items": service_list_executions(limit),
    }


@router.get("/api/v1/procedure-executions/{execution_code}")
def api_get_procedure_execution(execution_code: str):
    item = service_get_execution(execution_code)
    if not item:
        raise HTTPException(status_code=404, detail="Procedure execution not found")

    return {
        "success": True,
        "item": item,
    }

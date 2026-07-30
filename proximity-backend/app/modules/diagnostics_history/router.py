from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from .repository import list_history
from .schemas import DiagnosticExecutionOut, DiagnosticHistoryResponse

router = APIRouter(
    prefix="/api/v1/devices",
    tags=["diagnostics-history"],
)


@router.get(
    "/{acs_device_id:path}/diagnostics/history",
    response_model=DiagnosticHistoryResponse,
)
def get_diagnostics_history(
    acs_device_id: str,
    diagnostic_type: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> DiagnosticHistoryResponse:
    try:
        rows = list_history(acs_device_id, diagnostic_type, limit)
        items = [DiagnosticExecutionOut(**row) for row in rows]
        return DiagnosticHistoryResponse(count=len(items), items=items)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc

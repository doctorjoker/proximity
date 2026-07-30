from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from .schemas import (
    DownloadCapability,
    DownloadExecution,
    DownloadStartRequest,
)
from .service import DiagnosticError, service


router = APIRouter(
    prefix="/api/v1/devices",
    tags=["TR-143 Diagnostics"],
)


@router.get(
    "/{device_id:path}/diagnostics/download/capability",
    response_model=DownloadCapability,
)
async def get_download_capability(device_id: str) -> DownloadCapability:
    try:
        return DownloadCapability(**(await service.capability(device_id)))
    except DiagnosticError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.post(
    "/{device_id:path}/diagnostics/download/start",
    response_model=DownloadExecution,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_download_diagnostic(
    device_id: str,
    payload: DownloadStartRequest | None = None,
) -> DownloadExecution:
    request = payload or DownloadStartRequest()
    try:
        return await service.start(
            device_id,
            file_name=request.file_name,
            download_url=str(request.download_url) if request.download_url else None,
            timeout_seconds=request.timeout_seconds,
        )
    except DiagnosticError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get(
    "/{device_id:path}/diagnostics/download/executions/{execution_id}",
    response_model=DownloadExecution,
)
async def get_download_execution(
    device_id: str,
    execution_id: UUID,
) -> DownloadExecution:
    execution = await service.get(execution_id)
    if not execution or execution.device_id != device_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagnostic execution not found",
        )
    return execution

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db

from .registry import list_diagnostic_types
from .runner import run_job
from .schemas import DiagnosticJobCancel, DiagnosticJobCreate
from .service import DiagnosticsEngineError, cancel_job, create_job, get_job, list_jobs

router = APIRouter(prefix="/api/v1/device-diagnostics", tags=["Device Diagnostics Engine"])


def _raise(exc: DiagnosticsEngineError) -> None:
    raise HTTPException(
        status_code=exc.status_code,
        detail={"code": exc.code, "message": str(exc)},
    ) from exc


@router.get("/engine")
def engine_info():
    return {
        "success": True,
        "engine": "Device360 Diagnostics Engine",
        "version": "EUREKA32.1.3",
        "lifecycle": [
            "CREATED", "QUEUED", "REQUESTED", "RUNNING", "COLLECTING",
            "COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT",
        ],
        "diagnostic_types": list_diagnostic_types(),
    }


@router.post("/jobs", status_code=202)
def api_create_job(
    payload: DiagnosticJobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    try:
        job = create_job(db, payload.model_dump())
    except DiagnosticsEngineError as exc:
        _raise(exc)
    background_tasks.add_task(run_job, job["id"])
    return {"success": True, "job": job}


@router.get("/jobs")
def api_list_jobs(
    device_id: UUID | None = None,
    status: str | None = Query(default=None, max_length=30),
    diagnostic_type: str | None = Query(default=None, max_length=80),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return {
        "success": True,
        "items": list_jobs(
            db,
            device_id=device_id,
            status=status.upper() if status else None,
            diagnostic_type=diagnostic_type.upper() if diagnostic_type else None,
            limit=limit,
        ),
    }


@router.get("/jobs/{job_id}")
def api_get_job(job_id: UUID, db: Session = Depends(get_db)):
    try:
        return {"success": True, "job": get_job(db, job_id)}
    except DiagnosticsEngineError as exc:
        _raise(exc)


@router.post("/jobs/{job_id}/cancel")
def api_cancel_job(
    job_id: UUID,
    payload: DiagnosticJobCancel = DiagnosticJobCancel(),
    db: Session = Depends(get_db),
):
    try:
        return {"success": True, "job": cancel_job(db, job_id, payload.reason)}
    except DiagnosticsEngineError as exc:
        _raise(exc)

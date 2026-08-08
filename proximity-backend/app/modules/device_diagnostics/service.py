from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from . import repository
from .models import ALLOWED_TRANSITIONS, DiagnosticJobStatus, TERMINAL_STATUSES
from .registry import get_handler, list_diagnostic_types


class DiagnosticsEngineError(RuntimeError):
    status_code = 400
    code = "DIAGNOSTICS_ENGINE_ERROR"


class DiagnosticNotFoundError(DiagnosticsEngineError):
    status_code = 404
    code = "DIAGNOSTIC_JOB_NOT_FOUND"


class UnsupportedDiagnosticError(DiagnosticsEngineError):
    status_code = 422
    code = "UNSUPPORTED_DIAGNOSTIC_TYPE"


class InvalidTransitionError(DiagnosticsEngineError):
    status_code = 409
    code = "INVALID_DIAGNOSTIC_TRANSITION"


def transition(db: Session, job_id: UUID | str, target: DiagnosticJobStatus, **changes: Any) -> dict[str, Any]:
    current = repository.get_job(db, job_id)
    if not current:
        raise DiagnosticNotFoundError("Diagnostic job not found")
    source = DiagnosticJobStatus(current["status"])
    if source == target:
        return current
    if source in TERMINAL_STATUSES or target not in ALLOWED_TRANSITIONS.get(source, set()):
        raise InvalidTransitionError(f"Transition {source.value} -> {target.value} is not allowed")
    updated = repository.update_job(db, job_id, status=target.value, **changes)
    if not updated:
        raise DiagnosticNotFoundError("Diagnostic job not found")
    return updated


def create_job(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    diagnostic_type = payload["diagnostic_type"].strip().upper()
    if not get_handler(diagnostic_type):
        raise UnsupportedDiagnosticError(
            f"Diagnostic type '{diagnostic_type}' is not registered. Supported: {', '.join(list_diagnostic_types())}"
        )
    if not repository.device_exists(db, payload["device_id"]):
        raise DiagnosticNotFoundError("Device not found")
    item = repository.create_job(db, {**payload, "diagnostic_type": diagnostic_type})
    return transition(db, item["id"], DiagnosticJobStatus.QUEUED, progress=5)


def get_job(db: Session, job_id: UUID) -> dict[str, Any]:
    item = repository.get_job(db, job_id)
    if not item:
        raise DiagnosticNotFoundError("Diagnostic job not found")
    return item


def list_jobs(db: Session, **filters: Any) -> list[dict[str, Any]]:
    return repository.list_jobs(db, **filters)


def cancel_job(db: Session, job_id: UUID, reason: str | None = None) -> dict[str, Any]:
    return transition(
        db,
        job_id,
        DiagnosticJobStatus.CANCELLED,
        progress=100,
        error={"code": "CANCELLED", "message": reason or "Cancelled by operator"},
    )

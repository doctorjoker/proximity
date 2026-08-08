from __future__ import annotations

from uuid import UUID

from app.db.session import SessionLocal

from .models import DiagnosticJobStatus
from .registry import get_handler
from .service import transition


async def run_job(job_id: UUID | str) -> None:
    """Execute a registered diagnostic handler using an isolated DB session."""
    db = SessionLocal()
    try:
        from .repository import get_job

        job = get_job(db, job_id)
        if not job:
            return
        handler = get_handler(job["diagnostic_type"])
        if not handler:
            transition(
                db,
                job_id,
                DiagnosticJobStatus.FAILED,
                progress=100,
                error={"code": "HANDLER_NOT_FOUND", "message": "Diagnostic handler not registered"},
            )
            return
        transition(db, job_id, DiagnosticJobStatus.REQUESTED, progress=20)
        transition(db, job_id, DiagnosticJobStatus.RUNNING, progress=50)
        result = await handler(job)
        transition(db, job_id, DiagnosticJobStatus.COLLECTING, progress=80)
        transition(db, job_id, DiagnosticJobStatus.COMPLETED, progress=100, result=result)
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        try:
            transition(
                db,
                job_id,
                DiagnosticJobStatus.FAILED,
                progress=100,
                error={"code": exc.__class__.__name__, "message": str(exc)},
            )
        except Exception:  # noqa: BLE001
            db.rollback()
    finally:
        db.close()

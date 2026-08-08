from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session


def _json(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    item = dict(row)
    for key in ("parameters", "result", "error", "metadata"):
        if item.get(key) is None:
            item[key] = {}
    for key, value in list(item.items()):
        if isinstance(value, UUID):
            item[key] = str(value)
        elif isinstance(value, datetime):
            item[key] = value.isoformat()
    return item


def device_exists(db: Session, device_id: UUID) -> bool:
    return bool(db.execute(text("SELECT 1 FROM devices WHERE id = :id"), {"id": str(device_id)}).scalar())


def create_job(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    job_id = uuid4()
    row = db.execute(
        text(
            """
            INSERT INTO device_diagnostic_jobs (
                id, device_id, diagnostic_type, status, progress,
                parameters, timeout_seconds, requested_by, metadata
            ) VALUES (
                :id, :device_id, :diagnostic_type, 'CREATED', 0,
                CAST(:parameters AS jsonb), :timeout_seconds, :requested_by,
                '{}'::jsonb
            )
            RETURNING *
            """
        ),
        {
            "id": str(job_id),
            "device_id": str(payload["device_id"]),
            "diagnostic_type": payload["diagnostic_type"],
            "parameters": _json(payload.get("parameters")),
            "timeout_seconds": payload.get("timeout_seconds", 120),
            "requested_by": payload.get("requested_by"),
        },
    ).mappings().first()
    db.commit()
    return _row(row) or {}


def get_job(db: Session, job_id: UUID | str, *, for_update: bool = False) -> dict[str, Any] | None:
    suffix = " FOR UPDATE" if for_update else ""
    row = db.execute(
        text(f"SELECT * FROM device_diagnostic_jobs WHERE id = :id{suffix}"),
        {"id": str(job_id)},
    ).mappings().first()
    return _row(row)


def list_jobs(
    db: Session,
    *,
    device_id: UUID | None = None,
    status: str | None = None,
    diagnostic_type: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    clauses = []
    params: dict[str, Any] = {"limit": max(1, min(limit, 200))}
    if device_id:
        clauses.append("device_id = :device_id")
        params["device_id"] = str(device_id)
    if status:
        clauses.append("status = :status")
        params["status"] = status
    if diagnostic_type:
        clauses.append("diagnostic_type = :diagnostic_type")
        params["diagnostic_type"] = diagnostic_type
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    rows = db.execute(
        text(
            f"""
            SELECT * FROM device_diagnostic_jobs
            {where}
            ORDER BY created_at DESC
            LIMIT :limit
            """
        ),
        params,
    ).mappings().all()
    return [_row(row) or {} for row in rows]


def update_job(
    db: Session,
    job_id: UUID | str,
    *,
    status: str,
    progress: int | None = None,
    result: dict[str, Any] | None = None,
    error: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    started_at = "started_at = COALESCE(started_at, now())," if status in {"REQUESTED", "RUNNING", "COLLECTING"} else ""
    completed_at = "completed_at = now()," if status in {"COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"} else ""
    row = db.execute(
        text(
            f"""
            UPDATE device_diagnostic_jobs
            SET status = :status,
                progress = COALESCE(:progress, progress),
                result = COALESCE(CAST(:result AS jsonb), result),
                error = COALESCE(CAST(:error AS jsonb), error),
                metadata = COALESCE(CAST(:metadata AS jsonb), metadata),
                {started_at}
                {completed_at}
                updated_at = now()
            WHERE id = :id
            RETURNING *
            """
        ),
        {
            "id": str(job_id),
            "status": status,
            "progress": progress,
            "result": _json(result) if result is not None else None,
            "error": _json(error) if error is not None else None,
            "metadata": _json(metadata) if metadata is not None else None,
        },
    ).mappings().first()
    db.commit()
    return _row(row)

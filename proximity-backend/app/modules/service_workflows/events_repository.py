from sqlalchemy import text

from app.db.session import SessionLocal


def create_event(
    workflow_code: str,
    event_type: str,
    event_status: str,
    title: str,
    description: str | None = None,
    operation_code: str | None = None,
    duration_ms: int | None = None,
    worker_name: str | None = None,
    metadata: dict | None = None,
):
    db = SessionLocal()

    try:
        row = db.execute(
            text(
                """
                INSERT INTO workflow_events (
                    workflow_code,
                    operation_code,
                    event_type,
                    event_status,
                    title,
                    description,
                    duration_ms,
                    worker_name,
                    metadata
                )
                VALUES (
                    :workflow_code,
                    :operation_code,
                    :event_type,
                    :event_status,
                    :title,
                    :description,
                    :duration_ms,
                    :worker_name,
                    CAST(:metadata AS jsonb)
                )
                RETURNING id
                """
            ),
            {
                "workflow_code": workflow_code,
                "operation_code": operation_code,
                "event_type": event_type,
                "event_status": event_status,
                "title": title,
                "description": description,
                "duration_ms": duration_ms,
                "worker_name": worker_name,
                "metadata": "{}" if metadata is None else __import__("json").dumps(metadata),
            },
        ).first()

        db.commit()

        return str(row.id)

    finally:
        db.close()


def list_events(workflow_code: str):
    db = SessionLocal()

    try:
        rows = db.execute(
            text(
                """
                SELECT *

                FROM workflow_events

                WHERE workflow_code=:workflow_code

                ORDER BY event_time ASC
                """
            ),
            {
                "workflow_code": workflow_code,
            },
        ).mappings().all()

        return [dict(r) for r in rows]

    finally:
        db.close()


def last_event(workflow_code: str):
    db = SessionLocal()

    try:
        row = db.execute(
            text(
                """
                SELECT *

                FROM workflow_events

                WHERE workflow_code=:workflow_code

                ORDER BY event_time DESC

                LIMIT 1
                """
            ),
            {
                "workflow_code": workflow_code,
            },
        ).mappings().first()

        return dict(row) if row else None

    finally:
        db.close()


def count_events(workflow_code: str):
    db = SessionLocal()

    try:
        return db.execute(
            text(
                """
                SELECT COUNT(*)

                FROM workflow_events

                WHERE workflow_code=:workflow_code
                """
            ),
            {
                "workflow_code": workflow_code,
            },
        ).scalar()

    finally:
        db.close()

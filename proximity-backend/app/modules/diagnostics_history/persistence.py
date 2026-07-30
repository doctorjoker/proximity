from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import psycopg2
import psycopg2.extras

from app.core.config import settings


def _connect():
    return psycopg2.connect(settings.database_url)


def _terminal(state: str | None) -> bool:
    return str(state or "").upper() in {"COMPLETE", "COMPLETED", "ERROR", "TIMEOUT", "FAILED"}


def _json_safe(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items() if k != "started_at"}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def persist_download_execution(
    acs_device_id: str,
    execution: dict[str, Any],
    current: dict[str, Any] | None = None,
) -> None:
    current = current or {}
    state = str(execution.get("state") or current.get("state") or "REQUESTED").upper()
    completed_at = datetime.now(timezone.utc) if _terminal(state) else None
    started_at = execution.get("started_at_iso") or datetime.now(timezone.utc).isoformat()

    result_payload = _json_safe({
        "execution": execution,
        "result": current,
    })

    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO diagnostic_executions (
                    execution_id, acs_device_id, diagnostic_type,
                    state, phase, progress, requested_url, object_path,
                    throughput_mbps, duration_ms, tcp_open_ms,
                    test_bytes_received, total_bytes_received,
                    raw_state, result_payload, started_at, completed_at,
                    updated_at
                ) VALUES (
                    %s, %s, 'DOWNLOAD',
                    %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s,
                    %s, %s, %s, %s,
                    NOW()
                )
                ON CONFLICT (execution_id) DO UPDATE SET
                    state = EXCLUDED.state,
                    phase = EXCLUDED.phase,
                    progress = EXCLUDED.progress,
                    requested_url = EXCLUDED.requested_url,
                    object_path = EXCLUDED.object_path,
                    throughput_mbps = EXCLUDED.throughput_mbps,
                    duration_ms = EXCLUDED.duration_ms,
                    tcp_open_ms = EXCLUDED.tcp_open_ms,
                    test_bytes_received = EXCLUDED.test_bytes_received,
                    total_bytes_received = EXCLUDED.total_bytes_received,
                    raw_state = EXCLUDED.raw_state,
                    result_payload = EXCLUDED.result_payload,
                    completed_at = COALESCE(EXCLUDED.completed_at, diagnostic_executions.completed_at),
                    updated_at = NOW()
                """,
                (
                    execution["execution_id"],
                    acs_device_id,
                    state,
                    execution.get("phase"),
                    int(execution.get("progress") or 0),
                    execution.get("url"),
                    execution.get("object_path"),
                    current.get("throughput_mbps"),
                    current.get("duration_ms"),
                    current.get("tcp_open_ms"),
                    current.get("test_bytes_received"),
                    current.get("total_bytes_received"),
                    current.get("raw_state"),
                    psycopg2.extras.Json(result_payload),
                    started_at,
                    completed_at,
                ),
            )

            for position, event in enumerate(execution.get("events") or []):
                event_key = str(event.get("event_key") or event.get("phase") or f"EVENT_{position}")
                cur.execute(
                    """
                    INSERT INTO diagnostic_execution_events (
                        execution_id, event_key, event_type, phase,
                        title, detail, occurred_at, metadata
                    ) VALUES (%s, %s, %s, %s, %s, %s, COALESCE(%s::timestamptz, NOW()), %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (
                        execution["execution_id"],
                        event_key,
                        event.get("type") or event.get("event_type") or "info",
                        event.get("phase"),
                        event.get("title") or "Diagnostic event",
                        event.get("detail"),
                        event.get("timestamp") or event.get("occurred_at"),
                        psycopg2.extras.Json(_json_safe(event)),
                    ),
                )

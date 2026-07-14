import os
from typing import Any, Dict, Optional

import psycopg2
import psycopg2.extras

from app.core.config import settings


DATABASE_URL = os.getenv("DATABASE_URL", settings.database_url)


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def _fetch_one(cur, query: str, params: tuple = ()):
    cur.execute(query, params)
    return cur.fetchone()


def get_procedure_version(code: str, version: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    d.id AS definition_id,
                    d.code AS procedure_code,
                    d.name AS procedure_name,
                    d.status AS procedure_status,
                    d.active_version_id,
                    d.draft_version_id,
                    v.id AS version_id,
                    v.version,
                    v.status AS version_status,
                    v.base_version,
                    v.notes,
                    v.published_at
                FROM procedure_definitions d
                JOIN procedure_versions v ON v.definition_id = d.id
                WHERE d.code = %s
                  AND v.version = %s
                """,
                (code, version),
            )
            return cur.fetchone()


def create_execution(
    *,
    procedure_version: Dict[str, Any],
    workflow_code: str,
    workflow_type: str,
    requested_by: str,
    context: Dict[str, Any],
    mode: str,
):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO procedure_executions (
                    execution_code,
                    definition_id,
                    version_id,
                    procedure_code,
                    procedure_version,
                    workflow_code,
                    workflow_type,
                    status,
                    mode,
                    requested_by,
                    requested_at,
                    context_json
                )
                VALUES (
                    'TMP',
                    %(definition_id)s,
                    %(version_id)s,
                    %(procedure_code)s,
                    %(procedure_version)s,
                    %(workflow_code)s,
                    %(workflow_type)s,
                    'QUEUED',
                    %(mode)s,
                    %(requested_by)s,
                    now(),
                    %(context_json)s::jsonb
                )
                RETURNING *
                """,
                {
                    "definition_id": procedure_version["definition_id"],
                    "version_id": procedure_version["version_id"],
                    "procedure_code": procedure_version["procedure_code"],
                    "procedure_version": procedure_version["version"],
                    "workflow_code": workflow_code,
                    "workflow_type": workflow_type,
                    "mode": mode,
                    "requested_by": requested_by,
                    "context_json": psycopg2.extras.Json(context),
                },
            )
            execution = cur.fetchone()
            execution_code = f"PEX-{execution['id']:06d}"

            cur.execute(
                """
                UPDATE procedure_executions
                SET execution_code = %s
                WHERE id = %s
                RETURNING *
                """,
                (execution_code, execution["id"]),
            )
            return cur.fetchone()


def update_execution_scheduler_result(
    execution_id: int,
    scheduler_result: Dict[str, Any],
):
    status = scheduler_result.get("status") or "QUEUED"

    workflow_code = scheduler_result.get("workflow_code")
    workflow_type = scheduler_result.get("workflow_type")

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE procedure_executions
                SET
                    status = %s,
                    workflow_code = COALESCE(%s, workflow_code),
                    workflow_type = COALESCE(%s, workflow_type),
                    result_json = %s::jsonb,
                    updated_at = now()
                WHERE id = %s
                RETURNING *
                """,
                (
                    status,
                    workflow_code,
                    workflow_type,
                    psycopg2.extras.Json(scheduler_result),
                    execution_id,
                ),
            )

            return cur.fetchone()

def get_execution(execution_code: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM procedure_executions
                WHERE execution_code = %s
                   OR workflow_code = %s
                """,
                (execution_code, execution_code),
            )
            return cur.fetchone()


def list_executions(limit: int = 100):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM procedure_executions
                ORDER BY requested_at DESC, id DESC
                LIMIT %s
                """,
                (limit,),
            )
            return cur.fetchall()


def create_runtime_workflow_record(
    *,
    workflow_code: str,
    workflow_type: str,
    service_code: Optional[str],
    acs_device_id: Optional[str],
    payload: Dict[str, Any],
):
    """Create the workflow row consumed by service_workflows.scheduler.

    The historical service_workflows schema evolved during EUREKA 8/9, so this
    insert only uses columns that are present in the live table. This keeps the
    runtime adapter compatible with the current production database without
    duplicating the workflow engine.
    """
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'service_workflows'
                """
            )
            columns = {row["column_name"] for row in cur.fetchall()}

            if not columns:
                return {
                    "success": False,
                    "reason": "service_workflows table not found",
                }

            values = {}
            candidates = {
                "workflow_code": workflow_code,
                "workflow_type": workflow_type,
                "service_code": service_code or payload.get("service_code") or "N/A",
                "acs_device_id": acs_device_id or payload.get("acs_device_id"),
                "status": "QUEUED",
                "current_step": "QUEUED",
                "progress": 0,
                "payload": psycopg2.extras.Json(payload),
                "created_by": payload.get("requested_by") or "Procedure Runtime",
            }

            for key, value in candidates.items():
                if key in columns:
                    values[key] = value

            if "workflow_code" not in values:
                return {
                    "success": False,
                    "reason": "service_workflows.workflow_code column not found",
                }

            col_names = list(values.keys())
            placeholders = [f"%({name})s" for name in col_names]

            update_parts = []
            for name in col_names:
                if name != "workflow_code":
                    update_parts.append(f"{name} = EXCLUDED.{name}")
            if "updated_at" in columns:
                update_parts.append("updated_at = now()")

            conflict_sql = ""
            if update_parts:
                conflict_sql = "ON CONFLICT (workflow_code) DO UPDATE SET " + ", ".join(update_parts)
            else:
                conflict_sql = "ON CONFLICT (workflow_code) DO NOTHING"

            query = f"""
                INSERT INTO service_workflows ({', '.join(col_names)})
                VALUES ({', '.join(placeholders)})
                {conflict_sql}
                RETURNING *
            """
            cur.execute(query, values)
            row = cur.fetchone()

            if row is None:
                cur.execute(
                    "SELECT * FROM service_workflows WHERE workflow_code = %s",
                    (workflow_code,),
                )
                row = cur.fetchone()

            return {
                "success": True,
                "workflow": row,
            }


# ---------------------------------------------------------------------------
# EUREKA 9.5.1.1 - Procedure execution phase persistence
# ---------------------------------------------------------------------------


def create_execution_phase(
    *,
    execution_id: int,
    phase_key: str,
    phase_name: str,
    phase_order: int | None,
    handler_name: str,
    input_json: Dict[str, Any] | None = None,
    max_attempts: int = 1,
    retry_policy: Dict[str, Any] | None = None,
):
    """Create the persistent RUNNING record for one runtime phase."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO procedure_execution_phases (
                    execution_id,
                    phase_key,
                    phase_name,
                    phase_order,
                    handler_name,
                    status,
                    started_at,
                    input_json,
                    attempt,
                    max_attempts,
                    retry_policy,
                    attempts_json
                )
                VALUES (
                    %(execution_id)s,
                    %(phase_key)s,
                    %(phase_name)s,
                    %(phase_order)s,
                    %(handler_name)s,
                    'RUNNING',
                    now(),
                    %(input_json)s::jsonb,
                    1,
                    %(max_attempts)s,
                    %(retry_policy)s::jsonb,
                    '[]'::jsonb
                )
                RETURNING *
                """,
                {
                    "execution_id": execution_id,
                    "phase_key": phase_key,
                    "phase_name": phase_name,
                    "phase_order": phase_order,
                    "handler_name": handler_name,
                    "input_json": psycopg2.extras.Json(input_json or {}),
                    "max_attempts": max(1, int(max_attempts)),
                    "retry_policy": psycopg2.extras.Json(retry_policy or {}),
                },
            )
            return cur.fetchone()


def update_execution_phase(
    phase_id: int,
    *,
    status: str,
    duration_ms: int | None = None,
    output_json: Dict[str, Any] | None = None,
    error_json: Dict[str, Any] | None = None,
):
    """Finalize or update a persistent runtime phase record."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE procedure_execution_phases
                SET
                    status = %(status)s,
                    completed_at = CASE
                        WHEN %(status)s IN ('SUCCESS', 'FAILED', 'SKIPPED')
                        THEN now()
                        ELSE completed_at
                    END,
                    duration_ms = COALESCE(%(duration_ms)s, duration_ms),
                    output_json = COALESCE(%(output_json)s::jsonb, output_json),
                    error_json = COALESCE(%(error_json)s::jsonb, error_json),
                    updated_at = now()
                WHERE id = %(phase_id)s
                RETURNING *
                """,
                {
                    "phase_id": phase_id,
                    "status": status,
                    "duration_ms": duration_ms,
                    "output_json": (
                        psycopg2.extras.Json(output_json)
                        if output_json is not None
                        else None
                    ),
                    "error_json": (
                        psycopg2.extras.Json(error_json)
                        if error_json is not None
                        else None
                    ),
                },
            )
            return cur.fetchone()


def get_execution_phase(phase_id: int):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM procedure_execution_phases
                WHERE id = %s
                """,
                (phase_id,),
            )
            return cur.fetchone()


def list_execution_phases(execution_id: int):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM procedure_execution_phases
                WHERE execution_id = %s
                ORDER BY phase_order ASC NULLS LAST, id ASC
                """,
                (execution_id,),
            )
            return cur.fetchall()


def record_execution_phase_attempt(
    phase_id: int,
    *,
    attempt: int,
    success: bool,
    code: str | None,
    message: str | None,
    retry_delay_ms: int | None = None,
):
    """Append an immutable attempt summary and update retry state."""
    entry = {
        "attempt": attempt,
        "success": success,
        "code": code,
        "message": message,
        "retry_delay_ms": retry_delay_ms,
    }
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE procedure_execution_phases
                SET attempt = %(attempt)s,
                    retry_delay_ms = %(retry_delay_ms)s,
                    retry_reason = CASE WHEN %(success)s THEN NULL ELSE %(code)s END,
                    next_retry_at = CASE
                        WHEN NOT %(success)s AND COALESCE(%(retry_delay_ms)s, 0) > 0
                        THEN now() + (%(retry_delay_ms)s * interval '1 millisecond')
                        ELSE NULL
                    END,
                    attempts_json = COALESCE(attempts_json, '[]'::jsonb) || %(entry)s::jsonb,
                    updated_at = now()
                WHERE id = %(phase_id)s
                RETURNING *
                """,
                {
                    "phase_id": phase_id,
                    "attempt": attempt,
                    "success": success,
                    "code": code,
                    "retry_delay_ms": retry_delay_ms,
                    "entry": psycopg2.extras.Json([entry]),
                },
            )
            return cur.fetchone()

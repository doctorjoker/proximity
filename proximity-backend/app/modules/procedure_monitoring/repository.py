import os
from typing import Any, Dict, List, Optional

import psycopg2
import psycopg2.extras

from app.core.config import settings


DATABASE_URL = os.getenv("DATABASE_URL", settings.database_url)


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def _table_exists(cur, table_name: str) -> bool:
    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = %s
        ) AS exists
        """,
        (table_name,),
    )
    row = cur.fetchone()
    return bool(row and row.get("exists"))


def _columns(cur, table_name: str) -> set[str]:
    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
        """,
        (table_name,),
    )
    return {row["column_name"] for row in cur.fetchall()}


def _safe_order_column(cols: set[str]) -> str:
    for col in ("created_at", "started_at", "event_time", "timestamp", "updated_at", "id"):
        if col in cols:
            return col
    return "id"


def _select_all_by_workflow(cur, table_name: str, workflow_code: str, limit: int = 500) -> List[Dict[str, Any]]:
    if not _table_exists(cur, table_name):
        return []

    cols = _columns(cur, table_name)
    if "workflow_code" not in cols:
        return []

    order_col = _safe_order_column(cols)
    cur.execute(
        f"""
        SELECT *
        FROM {table_name}
        WHERE workflow_code = %s
        ORDER BY {order_col} ASC
        LIMIT %s
        """,
        (workflow_code, limit),
    )
    return cur.fetchall()


def list_execution_records(limit: int = 100) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            workflow_join = ""
            workflow_cols = "NULL::text AS workflow_engine_status, NULL::text AS current_step, NULL::int AS progress"
            if _table_exists(cur, "service_workflows"):
                cols = _columns(cur, "service_workflows")
                select_parts = []
                if "status" in cols:
                    select_parts.append("sw.status AS workflow_engine_status")
                else:
                    select_parts.append("NULL::text AS workflow_engine_status")
                if "current_step" in cols:
                    select_parts.append("sw.current_step AS current_step")
                else:
                    select_parts.append("NULL::text AS current_step")
                if "progress" in cols:
                    select_parts.append("sw.progress AS progress")
                else:
                    select_parts.append("NULL::int AS progress")
                workflow_cols = ", ".join(select_parts)
                workflow_join = "LEFT JOIN service_workflows sw ON sw.workflow_code = pe.workflow_code"

            cur.execute(
                f"""
                SELECT
                    pe.*,
                    {workflow_cols},
                    CASE
                        WHEN pe.completed_at IS NOT NULL AND pe.started_at IS NOT NULL
                            THEN EXTRACT(EPOCH FROM (pe.completed_at - pe.started_at))::int
                        WHEN pe.started_at IS NOT NULL
                            THEN EXTRACT(EPOCH FROM (now() - pe.started_at))::int
                        ELSE NULL
                    END AS duration_seconds
                FROM procedure_executions pe
                {workflow_join}
                ORDER BY pe.requested_at DESC, pe.id DESC
                LIMIT %s
                """,
                (limit,),
            )
            return cur.fetchall()


def get_execution_record(execution_code: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            workflow_join = ""
            workflow_cols = "NULL::jsonb AS workflow_record"
            if _table_exists(cur, "service_workflows"):
                workflow_join = "LEFT JOIN service_workflows sw ON sw.workflow_code = pe.workflow_code"
                workflow_cols = "to_jsonb(sw.*) AS workflow_record"

            cur.execute(
                f"""
                SELECT
                    pe.*,
                    {workflow_cols},
                    CASE
                        WHEN pe.completed_at IS NOT NULL AND pe.started_at IS NOT NULL
                            THEN EXTRACT(EPOCH FROM (pe.completed_at - pe.started_at))::int
                        WHEN pe.started_at IS NOT NULL
                            THEN EXTRACT(EPOCH FROM (now() - pe.started_at))::int
                        ELSE NULL
                    END AS duration_seconds
                FROM procedure_executions pe
                {workflow_join}
                WHERE pe.execution_code = %s
                   OR pe.workflow_code = %s
                """,
                (execution_code, execution_code),
            )
            return cur.fetchone()


def get_workflow_events(workflow_code: str) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            for table_name in ("workflow_events", "service_workflow_events"):
                rows = _select_all_by_workflow(cur, table_name, workflow_code)
                if rows:
                    return rows
            return []


def get_workflow_steps(workflow_code: str) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            for table_name in ("workflow_steps", "service_workflow_steps", "workflow_operations"):
                rows = _select_all_by_workflow(cur, table_name, workflow_code)
                if rows:
                    return rows
            return []


def build_timeline(execution_code: str) -> Optional[Dict[str, Any]]:
    execution = get_execution_record(execution_code)
    if not execution:
        return None

    workflow_code = execution.get("workflow_code")
    events = get_workflow_events(workflow_code) if workflow_code else []
    steps = get_workflow_steps(workflow_code) if workflow_code else []

    timeline = []
    timeline.append({
        "type": "EXECUTION_REQUESTED",
        "status": execution.get("status"),
        "title": "Execution requested",
        "description": f"Procedure execution {execution.get('execution_code')} requested",
        "timestamp": execution.get("requested_at") or execution.get("created_at"),
        "metadata": {
            "execution_code": execution.get("execution_code"),
            "workflow_code": workflow_code,
            "procedure_code": execution.get("procedure_code"),
            "procedure_version": execution.get("procedure_version"),
        },
    })

    for event in events:
        timeline.append({
            "type": event.get("event_type") or event.get("type") or "WORKFLOW_EVENT",
            "status": event.get("event_status") or event.get("status"),
            "title": event.get("title") or event.get("event_type") or "Workflow event",
            "description": event.get("description") or event.get("message"),
            "timestamp": event.get("created_at") or event.get("event_time") or event.get("timestamp"),
            "metadata": event.get("metadata") if isinstance(event.get("metadata"), dict) else event,
        })

    for step in steps:
        timeline.append({
            "type": "WORKFLOW_STEP",
            "status": step.get("status") or step.get("event_status"),
            "title": step.get("step_name") or step.get("step") or step.get("operation") or "Workflow step",
            "description": step.get("description") or step.get("message"),
            "timestamp": step.get("created_at") or step.get("started_at") or step.get("timestamp"),
            "metadata": step,
        })

    timeline.sort(key=lambda item: str(item.get("timestamp") or ""))

    return {
        "execution": execution,
        "items": timeline,
        "events_count": len(events),
        "steps_count": len(steps),
    }

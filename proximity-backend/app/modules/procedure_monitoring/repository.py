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
            WHERE table_schema = current_schema()
              AND table_name = %s
        ) AS present
        """,
        (table_name,),
    )
    row = cur.fetchone()
    return bool(row and row["present"])


def list_executions(limit: int = 100) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    e.*,
                    w.status AS workflow_engine_status,
                    w.current_step,
                    w.progress,
                    CASE
                        WHEN w.started_at IS NOT NULL AND w.completed_at IS NOT NULL
                        THEN EXTRACT(EPOCH FROM (w.completed_at - w.started_at))::bigint
                        ELSE NULL
                    END AS duration_seconds
                FROM procedure_executions e
                LEFT JOIN service_workflows w
                  ON w.workflow_code = e.workflow_code
                ORDER BY e.requested_at DESC, e.id DESC
                LIMIT %s
                """,
                (limit,),
            )
            return cur.fetchall()


def get_execution(execution_code: str) -> Optional[Dict[str, Any]]:
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
            execution = cur.fetchone()
            if not execution:
                return None

            cur.execute(
                """
                SELECT *
                FROM service_workflows
                WHERE workflow_code = %s
                """,
                (execution.get("workflow_code"),),
            )
            workflow = cur.fetchone()

            item = dict(execution)
            item["workflow_record"] = dict(workflow) if workflow else None
            if workflow and workflow.get("started_at") and workflow.get("completed_at"):
                item["duration_seconds"] = int(
                    (workflow["completed_at"] - workflow["started_at"]).total_seconds()
                )
            else:
                item["duration_seconds"] = None
            return item


def list_workflow_events(workflow_code: str) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if not _table_exists(cur, "workflow_events"):
                return []
            cur.execute(
                """
                SELECT *
                FROM workflow_events
                WHERE workflow_code = %s
                ORDER BY COALESCE(event_time, created_at) ASC, created_at ASC
                """,
                (workflow_code,),
            )
            return cur.fetchall()


def list_workflow_steps(workflow_code: str) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if not _table_exists(cur, "workflow_steps"):
                return []
            cur.execute(
                """
                SELECT *
                FROM workflow_steps
                WHERE workflow_code = %s
                ORDER BY started_at ASC NULLS LAST, created_at ASC
                """,
                (workflow_code,),
            )
            return cur.fetchall()


def list_persisted_phases(execution_code: str) -> Optional[List[Dict[str, Any]]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id
                FROM procedure_executions
                WHERE execution_code = %s
                   OR workflow_code = %s
                """,
                (execution_code, execution_code),
            )
            execution = cur.fetchone()
            if not execution:
                return None

            if not _table_exists(cur, "procedure_execution_phases"):
                return []

            cur.execute(
                """
                SELECT
                    p.*,
                    e.execution_code,
                    e.workflow_code,
                    e.procedure_code,
                    e.procedure_version
                FROM procedure_execution_phases p
                JOIN procedure_executions e ON e.id = p.execution_id
                WHERE p.execution_id = %s
                ORDER BY p.phase_order ASC, p.id ASC
                """,
                (execution["id"],),
            )
            return cur.fetchall()

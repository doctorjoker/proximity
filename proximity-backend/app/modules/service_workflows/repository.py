import os
import psycopg2
import psycopg2.extras


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://proximity:proximity_db@127.0.0.1:5434/proximity_db"
)


def get_conn():
    return psycopg2.connect(DATABASE_URL)

def create_workflow(
    workflow_code: str,
    workflow_type: str,
    service_code: str,
    acs_device_id: str,
    payload: dict | None = None,
    started_by: str = "PROXIMITY",
    parent_workflow_code: str | None = None,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:

            cur.execute(
                """
                INSERT INTO service_workflows
                (
                    workflow_code,
                    workflow_type,
                    service_code,
                    acs_device_id,
                    status,
                    current_step,
                    progress,
                    payload,
                    started_by,
                    parent_workflow_code
                )
                VALUES
                (
                    %s,%s,%s,%s,
                    'CREATED',
                    'INITIALIZED',
                    0,
                    %s,
                    %s,
                    %s
                )
                RETURNING *
                """,
                (
                    workflow_code,
                    workflow_type,
                    service_code,
                    acs_device_id,
                    psycopg2.extras.Json(payload or {}),
                    started_by,
                    parent_workflow_code,
                ),
            )

            return cur.fetchone()

def next_workflow_code():
    with get_conn() as conn:
        with conn.cursor() as cur:

            cur.execute(
                "SELECT nextval('workflow_code_seq')"
            )

            value = cur.fetchone()[0]

            return f"WF-{value:06d}"


def update_workflow_status(
    workflow_code: str,
    status: str,
    current_step: str,
    progress: int,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:

            cur.execute(
                """
                UPDATE service_workflows
                SET
                    status=%s,
                    current_step=%s,
                    progress=%s,
                    updated_at=now()
                WHERE workflow_code=%s
                RETURNING *
                """,
                (
                    status,
                    current_step,
                    progress,
                    workflow_code,
                ),
            )

            return cur.fetchone()

def complete_workflow(
    workflow_code: str,
    result: dict,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:

            cur.execute(
                """
                UPDATE service_workflows
                SET
                    status='COMPLETED',
                    current_step='FINISHED',
                    progress=100,
                    result=%s,
                    completed_at=now(),
                    updated_at=now()
                WHERE workflow_code=%s
                RETURNING *
                """,
                (
                    psycopg2.extras.Json(result),
                    workflow_code,
                ),
            )

            return cur.fetchone()

def fail_workflow(
    workflow_code: str,
    error_code: str,
    error_message: str,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:

            cur.execute(
                """
                UPDATE service_workflows
                SET
                    status='FAILED',
                    error_code=%s,
                    error_message=%s,
                    completed_at=now(),
                    updated_at=now()
                WHERE workflow_code=%s
                RETURNING *
                """,
                (
                    error_code,
                    error_message,
                    workflow_code,
                ),
            )

            return cur.fetchone()

def get_workflow(
    workflow_code: str,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:

            cur.execute(
                """
                SELECT *
                FROM service_workflows
                WHERE workflow_code=%s
                """,
                (workflow_code,),
            )

            return cur.fetchone()

def create_workflow_step(
    workflow_code: str,
    step_name: str,
    input_data: dict | None = None,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:

            cur.execute(
                """
                INSERT INTO workflow_steps
                (
                    workflow_code,
                    step_name,
                    status,
                    input
                )
                VALUES
                (
                    %s,
                    %s,
                    'RUNNING',
                    %s
                )
                RETURNING *
                """,
                (
                    workflow_code,
                    step_name,
                    psycopg2.extras.Json(input_data or {}),
                ),
            )

            return cur.fetchone()


def complete_workflow_step(
    step_id: str,
    output_data: dict | None = None,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:

            cur.execute(
                """
                UPDATE workflow_steps
                SET
                    status='SUCCESS',
                    completed_at=now(),
                    duration_ms = EXTRACT(
                        EPOCH FROM (now() - started_at)
                    ) * 1000,
                    output=%s
                WHERE id=%s
                RETURNING *
                """,
                (
                    psycopg2.extras.Json(output_data or {}),
                    step_id,
                ),
            )

            return cur.fetchone()


def fail_workflow_step(
    step_id: str,
    error_code: str,
    error_message: str,
    output_data: dict | None = None,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:

            cur.execute(
                """
                UPDATE workflow_steps
                SET
                    status='FAILED',
                    completed_at=now(),
                    duration_ms = EXTRACT(
                        EPOCH FROM (now() - started_at)
                    ) * 1000,
                    error_code=%s,
                    error_message=%s,
                    output=%s
                WHERE id=%s
                RETURNING *
                """,
                (
                    error_code,
                    error_message,
                    psycopg2.extras.Json(output_data or {}),
                    step_id,
                ),
            )

            return cur.fetchone()


def list_workflows(limit: int = 50):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                """
                SELECT
                    workflow_code,
                    workflow_type,
                    service_code,
                    acs_device_id,
                    status,
                    current_step,
                    progress,
                    started_by,
                    started_at,
                    completed_at,
                    error_code,
                    error_message
                FROM service_workflows
                ORDER BY started_at DESC
                LIMIT %s
                """,
                (limit,),
            )

            return cur.fetchall()


def get_workflow_steps(workflow_code: str):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    workflow_code,
                    step_name,
                    status,
                    input,
                    output,
                    started_at,
                    completed_at,
                    duration_ms,
                    error_code,
                    error_message
                FROM workflow_steps
                WHERE workflow_code = %s
                ORDER BY started_at ASC
                """,
                (workflow_code,),
            )

            return cur.fetchall()
